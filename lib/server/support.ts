import "server-only";
import { cookies, headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { currentUser, requireRole, type Actor } from "./auth";
import { opaqueToken, hashToken, validToken } from "./tokens";
import { invariant } from "./errors";
import { enforceLimit } from "./rate-limit";
import { requestIp } from "./http";
import { supportInput, entityId, cleanText } from "../marketplace-validation";
import { supportStatus } from "../support-hours";
import { serializable } from "./marketplace";
import { clientKey } from "../marketplace-validation";

type TicketAccess = { userId: string | null; guestTokenHash: string | null };
export function canReadTicket(
  ticket: TicketAccess,
  user: Pick<Actor, "id" | "role"> | null,
  guestHash: string | null,
) {
  if (user)
    return (
      ticket.userId === user.id ||
      user.role === "ADMIN" ||
      user.role === "SUPPORT"
    );
  return (
    ticket.userId === null &&
    Boolean(guestHash) &&
    ticket.guestTokenHash === guestHash
  );
}

async function context() {
  const user = await currentUser();
  const token = (await cookies()).get("zgjoi_support")?.value;
  return {
    user,
    guestHash: !user && validToken(token) ? hashToken(token) : null,
  };
}

async function setGuestCapability(token: string) {
  (await cookies()).set("zgjoi_support", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
}

export async function requireTicket(
  ticketId: string,
  tx: Prisma.TransactionClient = db,
) {
  entityId.parse(ticketId);
  const ctx = await context();
  const ticket = await tx.supportTicket.findUnique({ where: { id: ticketId } });
  invariant(
    ticket && canReadTicket(ticket, ctx.user, ctx.guestHash),
    "NOT_FOUND",
    404,
    "Biseda nuk u gjet.",
  );
  return { ticket, ...ctx };
}

export async function supportThread(ticketId?: string, before?: string) {
  const status = supportStatus();
  if (!ticketId) return { status, messages: [], hasMore: false };
  await requireTicket(ticketId);
  let older: Prisma.SupportMessageWhereInput = {};
  if (before) {
    entityId.parse(before);
    const cursor = await db.supportMessage.findFirst({
      where: { id: before, ticketId },
    });
    invariant(cursor, "NOT_FOUND", 404, "Mesazhi nuk u gjet.");
    older = {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
    };
  }
  const rows = await db.supportMessage.findMany({
    where: { ticketId, ...older },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 101,
    select: { id: true, body: true, fromAgent: true, createdAt: true },
  });
  return {
    status,
    hasMore: rows.length > 100,
    messages: rows
      .slice(0, 100)
      .reverse()
      .map((m) => ({
        ...m,
        time: new Intl.DateTimeFormat("sq", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Belgrade",
        }).format(m.createdAt),
      })),
  };
}

export async function sendSupport(input: unknown) {
  const data = supportInput.parse(input);
  const ctx = await context();
  await enforceLimit(
    `support:${ctx.user?.id ?? requestIp(await headers())}`,
    20,
    60_000,
  );
  const status = supportStatus();
  const guestToken =
    !ctx.user && !ctx.guestHash && !data.ticketId ? opaqueToken() : null;
  const guestHash =
    ctx.guestHash ?? (guestToken ? hashToken(guestToken) : null);
  const dedupeKey = data.clientKey
    ? hashToken(`support:${ctx.user?.id ?? guestHash}:${data.clientKey}`)
    : undefined;
  const result = await serializable(async (tx) => {
    if (dedupeKey) {
      const existing = await tx.supportMessage.findUnique({
        where: { dedupeKey },
        include: { ticket: true },
      });
      if (existing) {
        invariant(
          canReadTicket(existing.ticket, ctx.user, guestHash),
          "NOT_FOUND",
          404,
          "Biseda nuk u gjet.",
        );
        invariant(
          existing.body === data.body &&
            (!data.ticketId || data.ticketId === existing.ticketId),
          "RETRY_CHANGED",
          409,
          "Mesazhi ka ndryshuar. Dërgojeni si mesazh të ri.",
        );
        return {
          ok: true,
          ticketId: existing.ticketId,
          offline: existing.ticket.offline,
        };
      }
    }
    let ticket;
    if (data.ticketId) {
      ticket = await tx.supportTicket.findUnique({
        where: { id: data.ticketId },
      });
      invariant(
        ticket && canReadTicket(ticket, ctx.user, guestHash),
        "NOT_FOUND",
        404,
        "Biseda nuk u gjet.",
      );
      // Staff use their separate reply action for other people's tickets.
      invariant(
        !ctx.user || ticket.userId === ctx.user.id,
        "FORBIDDEN",
        403,
        "Përdorni përgjigjen e mbështetjes.",
      );
    } else {
      ticket = await tx.supportTicket.create({
        data: {
          userId: ctx.user?.id,
          guestTokenHash: ctx.user ? null : guestHash,
          guestName: ctx.user ? null : data.guestName || "Vizitor",
          guestEmail: ctx.user ? null : data.guestEmail || null,
          subject: data.body.slice(0, 80),
          offline: !status.online,
        },
      });
    }
    await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: ctx.user?.id,
        body: data.body,
        dedupeKey,
      },
    });
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { state: "OPEN", updatedAt: new Date() },
    });
    return { ok: true, ticketId: ticket.id, offline: !status.online };
  });
  if (guestToken) await setGuestCapability(guestToken);
  return result;
}

export async function replySupport(input: unknown) {
  const user = await requireRole("ADMIN", "SUPPORT");
  const data = z
    .object({
      ticketId: entityId,
      body: cleanText(1, 2000),
      clientKey: clientKey.optional(),
    })
    .parse(input);
  await enforceLimit(`staff-reply:${user.id}`, 60, 60_000);
  const dedupeKey = data.clientKey
    ? hashToken(`staff:${user.id}:${data.clientKey}`)
    : undefined;
  await serializable(async (tx) => {
    const ticket = await tx.supportTicket.findUnique({
      where: { id: data.ticketId },
    });
    invariant(ticket, "NOT_FOUND", 404, "Biseda nuk u gjet.");
    if (dedupeKey) {
      const existing = await tx.supportMessage.findUnique({
        where: { dedupeKey },
      });
      if (existing) {
        invariant(
          existing.ticketId === data.ticketId && existing.body === data.body,
          "RETRY_CHANGED",
          409,
          "Mesazhi ka ndryshuar. Dërgojeni si mesazh të ri.",
        );
        return;
      }
    }
    await tx.supportMessage.create({
      data: {
        ticketId: data.ticketId,
        senderId: user.id,
        body: data.body,
        fromAgent: true,
        dedupeKey,
      },
    });
    await tx.supportTicket.update({
      where: { id: data.ticketId },
      data: { state: "WAITING", offline: false },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "SUPPORT_REPLIED",
        target: data.ticketId,
      },
    });
  });
  return { ok: true };
}

export async function changeTicketState(input: unknown) {
  const user = await requireRole("ADMIN", "SUPPORT");
  const data = z
    .object({
      ticketId: entityId,
      state: z.enum(["OPEN", "WAITING", "RESOLVED"]),
    })
    .parse(input);
  await db.$transaction([
    db.supportTicket.update({
      where: { id: data.ticketId },
      data: { state: data.state },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action: "SUPPORT_STATE",
        target: data.ticketId,
        meta: { state: data.state },
      },
    }),
  ]);
  return { ok: true };
}

export async function currentSupport() {
  const ctx = await context();
  if (!ctx.user && !ctx.guestHash) {
    // The widget prepares this private capability before its first send so retries
    // remain bound to the same guest even when the first message response is lost.
    await setGuestCapability(opaqueToken());
    return { ticketId: null, identity: "guest" };
  }
  const ticket = await db.supportTicket.findFirst({
    where: ctx.user
      ? { userId: ctx.user.id }
      : { userId: null, guestTokenHash: ctx.guestHash },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  return { ticketId: ticket?.id ?? null, identity: ctx.user?.id ?? "guest" };
}
