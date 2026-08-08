"use server";

import { headers } from "next/headers";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { supportMessageSchema } from "@/lib/validation";
import { supportStatus } from "@/lib/support-hours";

export type SupportReply = {
  ok: boolean;
  ticketId?: string;
  error?: string;
  offline?: boolean;
};

/**
 * Opens a ticket on the first message and appends to it after that.
 * Outside working hours the ticket is flagged `offline` so agents see it
 * first thing next morning, and the widget tells the visitor as much.
 */
export async function sendSupportMessage(input: {
  ticketId?: string;
  body: string;
  guestName?: string;
  guestEmail?: string;
}): Promise<SupportReply> {
  const ip = headers().get("x-forwarded-for") ?? "local";
  if (!rateLimit(`support:${ip}`, 20, 60_000).ok) {
    return { ok: false, error: "Shumë mesazhe njëherësh. Prisni pak." };
  }

  const parsed = supportMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Shkruaj një mesazh." };
  }

  const user = await currentUser();
  const status = supportStatus();

  let ticketId = parsed.data.ticketId;

  if (!ticketId) {
    const ticket = await db.supportTicket.create({
      data: {
        userId: user?.id,
        guestName: user ? undefined : parsed.data.guestName || "Vizitor",
        guestEmail: user ? undefined : parsed.data.guestEmail || undefined,
        subject: parsed.data.body.slice(0, 80),
        offline: !status.online,
      },
    });
    ticketId = ticket.id;
  }

  await db.supportMessage.create({
    data: { ticketId, senderId: user?.id, body: parsed.data.body, fromAgent: false },
  });

  await db.supportTicket.update({
    where: { id: ticketId },
    data: { state: "OPEN", updatedAt: new Date() },
  });

  // Outside hours: leave an automatic acknowledgement so the visitor is
  // never left staring at silence.
  if (!status.online) {
    await db.supportMessage.create({
      data: {
        ticketId,
        fromAgent: true,
        body:
          `Faleminderit për mesazhin! Ekipi ynë është online e hënë–e premte, ` +
          `09:00–17:00 (koha e Kosovës). ${status.nextOpenLabel}. ` +
          `Do të të përgjigjemi sapo të kthehemi.`,
      },
    });
  }

  return { ok: true, ticketId, offline: !status.online };
}

export async function fetchSupportThread(ticketId: string) {
  const messages = await db.supportMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, fromAgent: true, createdAt: true },
  });
  return messages.map((m) => ({
    id: m.id,
    body: m.body,
    fromAgent: m.fromAgent,
    time: new Intl.DateTimeFormat("sq", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Belgrade",
    }).format(m.createdAt),
  }));
}

/* --------------------------------------------------------- agent side */

export async function agentReply(ticketId: string, body: string) {
  const user = await currentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPPORT")) {
    return { ok: false, error: "FORBIDDEN" };
  }
  await db.supportMessage.create({
    data: { ticketId, senderId: user.id, body, fromAgent: true },
  });
  await db.supportTicket.update({ where: { id: ticketId }, data: { state: "WAITING" } });
  return { ok: true };
}

export async function resolveTicket(ticketId: string) {
  const user = await currentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPPORT")) {
    return { ok: false, error: "FORBIDDEN" };
  }
  await db.supportTicket.update({ where: { id: ticketId }, data: { state: "RESOLVED" } });
  return { ok: true };
}
