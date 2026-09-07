import "server-only";
import { Prisma, type ServiceRequest } from "@prisma/client";
import { db } from "./db";
import { type Actor } from "./auth";
import { AppError, invariant } from "./errors";
import { notify } from "./notifications";
import { commissionBps, splitAmount } from "./settings";
import { enforceLimit } from "./rate-limit";
import { hashToken } from "./tokens";
import {
  inquiryInput,
  offerInput,
  acceptanceInput,
  chatInput,
  reviewInput,
  entityId,
  availabilityInput,
} from "../marketplace-validation";

import { serializable } from "./transaction";
export { serializable } from "./transaction";

export function isParticipant(
  request: Pick<
    ServiceRequest,
    "clientId" | "selectedProfileId" | "acceptedProfileId"
  >,
  actor: Pick<Actor, "id" | "role" | "proProfile">,
) {
  return (
    (actor.role === "CLIENT" && request.clientId === actor.id) ||
    (actor.role === "PRO" &&
      !!actor.proProfile &&
      (request.selectedProfileId ?? request.acceptedProfileId) ===
        actor.proProfile.id)
  );
}

export function assertNoContact(text: string) {
  invariant(
    !/(?:\+?\d[\s().-]*){7,}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\//i.test(
      text,
    ),
    "CONTACT_DETAILS",
    400,
    "Para rezervimit, mbajeni komunikimin në Zgjoi pa numra telefoni, email ose lidhje të jashtme.",
  );
}

function role(actor: Actor, expected: "CLIENT" | "PRO") {
  invariant(
    actor.role === expected,
    "FORBIDDEN",
    403,
    "Nuk keni qasje në këtë veprim.",
  );
}

export async function createInquiry(actor: Actor, input: unknown) {
  role(actor, "CLIENT");
  const data = inquiryInput.parse(input);
  assertNoContact(`${data.title}\n${data.detail}`);
  await enforceLimit(`inquiry:${actor.id}`, 15, 60 * 60_000);
  const creationKey = hashToken(`inquiry:${actor.id}:${data.clientKey}`);
  return serializable(async (tx) => {
    const existing = await tx.serviceRequest.findUnique({
      where: { creationKey },
    });
    if (existing)
      return {
        ok: true,
        id: existing.id,
        redirect: `/llogaria/kerkesat/${existing.id}`,
      };
    const profile = await tx.proProfile.findFirst({
      where: {
        id: data.profileId,
        verification: "APPROVED",
        user: { suspendedAt: null, role: "PRO" },
      },
    });
    invariant(
      profile && profile.userId !== actor.id,
      "PRO_UNAVAILABLE",
      409,
      "Ky profesionist nuk pranon kërkesa për momentin.",
    );
    invariant(
      await tx.category.findFirst({
        where: { slug: profile.categorySlug, active: true },
      }),
      "CATEGORY",
      409,
      "Kategoria nuk është aktive.",
    );
    const request = await tx.serviceRequest.create({
      data: {
        clientId: actor.id,
        selectedProfileId: profile.id,
        categorySlug: profile.categorySlug,
        title: data.title,
        detail: data.detail,
        city: data.city,
        timing: data.timing,
        address: data.address,
        answers: {},
        state: "OPEN",
        creationKey,
        conversation: { create: {} },
      },
    });
    await notify(
      tx,
      profile.userId,
      "INQUIRY",
      "Keni një kërkesë të re private",
      `/pro/kerkesat/${request.id}`,
    );
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "INQUIRY_CREATED",
        target: request.id,
      },
    });
    return {
      ok: true,
      id: request.id,
      redirect: `/llogaria/kerkesat/${request.id}`,
    };
  });
}

export async function createOffer(actor: Actor, input: unknown) {
  role(actor, "PRO");
  const data = offerInput.parse(input);
  assertNoContact(`${data.description}\n${data.timing}`);
  const expiresAt = new Date(data.expiresAt),
    scheduledAt = new Date(data.scheduledAt),
    now = new Date();
  invariant(
    expiresAt.getTime() > now.getTime() + 60_000 &&
      expiresAt.getTime() <= now.getTime() + 30 * 86400000 &&
      scheduledAt > expiresAt,
    "TIMING",
    400,
    "Oferta duhet të skadojë para fillimit të punës, brenda 30 ditëve.",
  );
  await enforceLimit(`offer:${actor.id}`, 30, 60 * 60_000);
  const creationKey = hashToken(`offer:${actor.id}:${data.clientKey}`);
  return serializable(async (tx) => {
    const previous = await tx.quote.findUnique({ where: { creationKey } });
    if (previous) return { ok: true, quoteId: previous.id };
    const request = await tx.serviceRequest.findUnique({
      where: { id: data.requestId },
      include: {
        selectedPro: { include: { user: { select: { suspendedAt: true } } } },
      },
    });
    invariant(
      request &&
        isParticipant(request, actor) &&
        request.selectedPro?.verification === "APPROVED" &&
        !request.selectedPro.user.suspendedAt,
      "NOT_FOUND",
      404,
      "Kërkesa nuk u gjet ose nuk është e disponueshme.",
    );
    invariant(
      ["OPEN", "QUOTED"].includes(request.state) &&
        request.version === data.expectedVersion,
      "STALE",
      409,
      "Kërkesa ka ndryshuar. Rifreskoni faqen para se të dërgoni ofertën.",
    );
    const revision =
      (
        await tx.quote.aggregate({
          where: { requestId: request.id },
          _max: { revision: true },
        })
      )._max.revision ?? 0;
    await tx.quote.updateMany({
      where: { requestId: request.id, state: "SENT" },
      data: { state: "WITHDRAWN" },
    });
    const quote = await tx.quote.create({
      data: {
        requestId: request.id,
        profileId: actor.proProfile!.id,
        amount: data.amount,
        lines: [{ label: data.description, qty: 1, priceCents: data.amount }],
        message: data.description,
        availableAt: data.timing,
        duration: data.duration,
        scheduledAt,
        expiresAt,
        revision: revision + 1,
        creationKey,
      },
    });
    const changed = await tx.serviceRequest.updateMany({
      where: {
        id: request.id,
        version: data.expectedVersion,
        state: { in: ["OPEN", "QUOTED"] },
      },
      data: { state: "QUOTED", version: { increment: 1 } },
    });
    invariant(
      changed.count === 1,
      "STALE",
      409,
      "Kërkesa ka ndryshuar. Rifreskoni faqen.",
    );
    await notify(
      tx,
      request.clientId,
      "OFFER",
      "Keni një ofertë zyrtare të re",
      `/llogaria/kerkesat/${request.id}`,
    );
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "OFFER_SENT",
        target: quote.id,
        meta: { revision: quote.revision, amount: quote.amount },
      },
    });
    return { ok: true, quoteId: quote.id };
  });
}

export async function acceptOffer(actor: Actor, input: unknown) {
  role(actor, "CLIENT");
  const data = acceptanceInput.parse(input);
  const bps = await commissionBps();
  return serializable(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: data.quoteId },
      include: {
        request: true,
        profile: {
          include: { user: { select: { suspendedAt: true, role: true } } },
        },
      },
    });
    invariant(
      quote && quote.request.clientId === actor.id,
      "NOT_FOUND",
      404,
      "Oferta nuk u gjet.",
    );
    const request = quote.request;
    if (request.acceptedQuoteId === quote.id)
      return {
        ok: true,
        requestId: request.id,
        redirect: `/llogaria/kerkesat/${request.id}`,
      };
    invariant(
      request.selectedProfileId === quote.profileId &&
        quote.profile.verification === "APPROVED" &&
        quote.profile.user.role === "PRO" &&
        !quote.profile.user.suspendedAt,
      "PRO_UNAVAILABLE",
      409,
      "Profesionisti nuk është i disponueshëm.",
    );
    invariant(
      quote.state === "SENT" &&
        quote.expiresAt &&
        quote.expiresAt > new Date() &&
        quote.scheduledAt &&
        quote.scheduledAt > new Date(),
      "EXPIRED",
      409,
      "Oferta ka skaduar ose është tërhequr. Kërkoni një ofertë të re.",
    );
    invariant(
      request.version === data.expectedVersion &&
        request.state === "QUOTED" &&
        !request.acceptedQuoteId,
      "STALE",
      409,
      "Kërkesa ka ndryshuar. Rifreskoni faqen.",
    );
    const updated = await tx.serviceRequest.updateMany({
      where: {
        id: request.id,
        clientId: actor.id,
        version: data.expectedVersion,
        state: "QUOTED",
        acceptedQuoteId: null,
      },
      data: {
        state: "BOOKED",
        acceptedQuoteId: quote.id,
        acceptedProfileId: quote.profileId,
        scheduledAt: quote.scheduledAt,
        version: { increment: 1 },
      },
    });
    invariant(
      updated.count === 1,
      "STALE",
      409,
      "Oferta është përpunuar tashmë.",
    );
    const accepted = await tx.quote.updateMany({
      where: { id: quote.id, state: "SENT", expiresAt: { gt: new Date() } },
      data: { state: "ACCEPTED", acceptedAt: new Date() },
    });
    invariant(
      accepted.count === 1,
      "EXPIRED",
      409,
      "Oferta nuk mund të pranohet më.",
    );
    await tx.payment.create({
      data: {
        requestId: request.id,
        amount: quote.amount,
        commissionBps: bps,
        ...splitAmount(quote.amount, bps),
        currency: "EUR",
        strategy: "PLATFORM_CHARGE",
        provider: "disabled",
        state: "PENDING",
      },
    });
    await notify(
      tx,
      quote.profile.userId,
      "ACCEPTED",
      "Oferta u pranua; pagesa është në pritje",
      `/pro/kerkesat/${request.id}`,
    );
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "OFFER_ACCEPTED",
        target: request.id,
        meta: { quoteId: quote.id, amount: quote.amount },
      },
    });
    return {
      ok: true,
      requestId: request.id,
      redirect: `/llogaria/kerkesat/${request.id}`,
    };
  });
}

export async function getRequest(actor: Actor, id: string) {
  entityId.parse(id);
  const request = await db.serviceRequest.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, city: true } },
      selectedPro: {
        select: {
          id: true,
          userId: true,
          verification: true,
          user: { select: { name: true } },
        },
      },
      quotes: { orderBy: { revision: "desc" }, take: 50 },
      conversation: { select: { id: true } },
      payment: {
        select: {
          id: true,
          amount: true,
          currency: true,
          state: true,
          commissionAmount: true,
          proAmount: true,
          provider: true,
          dispute: {
            select: {
              id: true,
              reason: true,
              resolution: true,
              resolvedAt: true,
            },
          },
        },
      },
      review: { select: { id: true, rating: true, text: true } },
    },
  });
  invariant(
    request && (isParticipant(request, actor) || actor.role === "ADMIN"),
    "NOT_FOUND",
    404,
    "Kërkesa nuk u gjet.",
  );
  const reveal =
    actor.role !== "PRO" ||
    ["HELD", "RELEASED", "DISPUTED", "REFUNDED"].includes(
      request.payment?.state ?? "",
    );
  return {
    ...request,
    address: reveal ? request.address : null,
    client: {
      ...request.client,
      name: reveal
        ? request.client.name
        : request.client.name
            .split(/\s+/)
            .map((n) => n[0])
            .join(".") + ".",
    },
  };
}

export async function sendJobMessage(actor: Actor, input: unknown) {
  const data = chatInput.parse(input);
  await enforceLimit(`message:${actor.id}`, 30, 60_000);
  return serializable(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: data.conversationId },
      include: {
        request: {
          include: {
            payment: { select: { state: true } },
            selectedPro: { select: { userId: true } },
          },
        },
      },
    });
    invariant(
      conversation && isParticipant(conversation.request, actor),
      "NOT_FOUND",
      404,
      "Biseda nuk u gjet.",
    );
    invariant(
      !["CANCELLED", "COMPLETED"].includes(conversation.request.state),
      "CLOSED",
      409,
      "Biseda për këtë punë është mbyllur. Kontaktoni mbështetjen nëse ju nevojitet ndihmë.",
    );
    if (
      !["HELD", "RELEASED", "DISPUTED"].includes(
        conversation.request.payment?.state ?? "",
      )
    )
      assertNoContact(data.body);
    const previous = await tx.message.findUnique({
      where: {
        conversationId_senderId_clientKey: {
          conversationId: data.conversationId,
          senderId: actor.id,
          clientKey: data.clientKey,
        },
      },
    });
    if (previous) return { ok: true, id: previous.id };
    const message = await tx.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: actor.id,
        body: data.body,
        clientKey: data.clientKey,
      },
    });
    const recipient =
      actor.role === "PRO"
        ? conversation.request.clientId
        : conversation.request.selectedPro?.userId;
    if (recipient)
      await notify(
        tx,
        recipient,
        "MESSAGE",
        "Keni një mesazh të ri",
        `${actor.role === "PRO" ? "/llogaria" : "/pro"}/kerkesat/${conversation.requestId}`,
      );
    return { ok: true, id: message.id };
  });
}

export async function readJobMessages(
  actor: Actor,
  conversationId: string,
  before?: string,
) {
  entityId.parse(conversationId);
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { request: true },
  });
  invariant(
    conversation &&
      (isParticipant(conversation.request, actor) || actor.role === "ADMIN"),
    "NOT_FOUND",
    404,
    "Biseda nuk u gjet.",
  );
  let older: Prisma.MessageWhereInput = {};
  if (before) {
    entityId.parse(before);
    const cursor = await db.message.findFirst({
      where: { id: before, conversationId },
    });
    invariant(cursor, "NOT_FOUND", 404, "Mesazhi nuk u gjet.");
    older = {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
    };
  }
  const rows = await db.message.findMany({
    where: { conversationId, ...older },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 101,
    select: { id: true, body: true, senderId: true, createdAt: true },
  });
  if (isParticipant(conversation.request, actor))
    await db.message.updateMany({
      where: {
        conversationId,
        senderId: { not: actor.id },
        readAt: null,
        id: { in: rows.slice(0, 100).map((m) => m.id) },
      },
      data: { readAt: new Date() },
    });
  return {
    hasMore: rows.length > 100,
    messages: rows
      .slice(0, 100)
      .reverse()
      .map((m) => ({
        id: m.id,
        body: m.body,
        mine: m.senderId === actor.id,
        createdAt: m.createdAt,
        time: new Intl.DateTimeFormat("sq", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Belgrade",
        }).format(m.createdAt),
      })),
  };
}

export async function changeJob(
  actor: Actor,
  id: string,
  action:
    | "START"
    | "REQUEST_COMPLETION"
    | "CONFIRM_COMPLETION"
    | "CANCEL"
    | "DECLINE"
    | "WITHDRAW",
  quoteId?: string,
) {
  entityId.parse(id);
  return serializable(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id },
      include: {
        payment: { include: { dispute: true } },
        selectedPro: { select: { userId: true } },
      },
    });
    invariant(
      request && isParticipant(request, actor),
      "NOT_FOUND",
      404,
      "Kërkesa nuk u gjet.",
    );
    if (action === "CONFIRM_COMPLETION") {
      role(actor, "CLIENT");
      if (request.state === "COMPLETED") return { ok: true };
      invariant(
        ["BOOKED", "IN_PROGRESS"].includes(request.state) &&
          request.payment?.state === "HELD" &&
          !request.payment.dispute &&
          request.acceptedProfileId,
        "STATE",
        409,
        "Përfundimi kërkon pagesë të konfirmuar dhe asnjë kontest të hapur.",
      );
      await tx.serviceRequest.update({
        where: { id },
        data: {
          state: "COMPLETED",
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.payout.upsert({
        where: { paymentId: request.payment.id },
        create: {
          paymentId: request.payment.id,
          profileId: request.acceptedProfileId,
          amount: request.payment.proAmount,
          scheduledFor: new Date(),
          state: "SCHEDULED",
          providerOperationKey: `release:${request.payment.id}`,
        },
        update: {},
      });
    } else if (action === "START" || action === "REQUEST_COMPLETION") {
      role(actor, "PRO");
      invariant(
        ["BOOKED", "IN_PROGRESS"].includes(request.state) &&
          request.payment?.state === "HELD" &&
          !request.payment.dispute,
        "UNFUNDED",
        409,
        "Prisni konfirmimin e pagesës para fillimit të punës.",
      );
      await tx.serviceRequest.update({
        where: { id },
        data: {
          state: "IN_PROGRESS",
          ...(action === "REQUEST_COMPLETION"
            ? { completionRequestedAt: new Date() }
            : {}),
          version: { increment: 1 },
        },
      });
    } else if (action === "CANCEL") {
      invariant(
        ["OPEN", "QUOTED"].includes(request.state) && !request.payment,
        "FUNDED_CANCELLATION",
        409,
        "Për një ofertë të pranuar ose pagesë aktive, kontaktoni mbështetjen për anulimin.",
      );
      await tx.serviceRequest.update({
        where: { id },
        data: {
          state: "CANCELLED",
          cancelledAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.quote.updateMany({
        where: { requestId: id, state: "SENT" },
        data: { state: "WITHDRAWN" },
      });
    } else {
      role(actor, action === "DECLINE" ? "CLIENT" : "PRO");
      entityId.parse(quoteId);
      invariant(
        request.state === "QUOTED",
        "STATE",
        409,
        "Oferta nuk mund të ndryshohet më.",
      );
      const updated = await tx.quote.updateMany({
        where: { id: quoteId, requestId: id, state: "SENT" },
        data: { state: action === "DECLINE" ? "DECLINED" : "WITHDRAWN" },
      });
      invariant(updated.count === 1, "STALE", 409, "Oferta ka ndryshuar.");
      await tx.serviceRequest.update({
        where: { id },
        data: { state: "OPEN", version: { increment: 1 } },
      });
    }
    const recipient =
      actor.role === "PRO" ? request.clientId : request.selectedPro?.userId;
    if (recipient)
      await notify(
        tx,
        recipient,
        action,
        action === "CONFIRM_COMPLETION"
          ? "Klienti konfirmoi përfundimin e punës"
          : "Kërkesa juaj është përditësuar",
        `${actor.role === "PRO" ? "/llogaria" : "/pro"}/kerkesat/${id}`,
      );
    await tx.auditLog.create({
      data: { actorId: actor.id, action, target: id },
    });
    return { ok: true };
  });
}

export async function publishReview(actor: Actor, input: unknown) {
  role(actor, "CLIENT");
  const data = reviewInput.parse(input);
  return serializable(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id: data.requestId },
      include: { review: true },
    });
    invariant(
      request &&
        request.clientId === actor.id &&
        request.state === "COMPLETED" &&
        request.completedAt &&
        request.acceptedProfileId,
      "NOT_COMPLETED",
      409,
      "Vlerësimi bëhet pas përfundimit të konfirmuar të punës.",
    );
    if (request.review) return { ok: true, id: request.review.id };
    const review = await tx.review.create({
      data: {
        ...data,
        authorId: actor.id,
        profileId: request.acceptedProfileId,
      },
    });
    const stats = await tx.review.aggregate({
      where: { profileId: request.acceptedProfileId, state: "PUBLISHED" },
      _count: true,
      _avg: { rating: true },
    });
    await tx.proProfile.update({
      where: { id: request.acceptedProfileId },
      data: { ratingCount: stats._count, ratingAvg: stats._avg.rating ?? 0 },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "REVIEW_PUBLISHED",
        target: review.id,
      },
    });
    return { ok: true, id: review.id };
  });
}

export async function saveAvailability(actor: Actor, input: unknown) {
  role(actor, "PRO");
  invariant(actor.proProfile, "NO_PROFILE", 403, "Profili nuk u gjet.");
  const data = availabilityInput.parse(input);
  await db.$transaction(async (tx) => {
    await tx.availability.deleteMany({
      where: { profileId: actor.proProfile!.id },
    });
    if (data.days.length)
      await tx.availability.createMany({
        data: data.days.map((day) => ({
          ...day,
          profileId: actor.proProfile!.id,
        })),
      });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "AVAILABILITY_UPDATED",
        target: actor.proProfile!.id,
      },
    });
  });
  return { ok: true };
}
