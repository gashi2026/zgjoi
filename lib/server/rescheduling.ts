import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { Actor } from "./auth";
import { entityId, clientKey, cleanText } from "../marketplace-validation";
import { serializable } from "./transaction";
import { invariant } from "./errors";
import { assertNoContact, isParticipant } from "./marketplace";
import { assertAppointmentAvailable } from "./appointments";
import { paymentActivity, paymentUntouched } from "./unpaid-booking";
import { hashToken } from "./tokens";
import { notify } from "./notifications";
import { enforceLimit } from "./rate-limit";

const proposalInput = z.object({
  clientKey, expectedVersion: z.number().int().nonnegative(),
  timing: cleanText(3, 120), scheduledAt: z.string().datetime(), expiresAt: z.string().datetime(),
}).strict();
const decisionInput = z.object({
  action: z.enum(["ACCEPT", "DECLINE", "WITHDRAW"]), quoteId: entityId,
  expectedVersion: z.number().int().nonnegative(),
}).strict();
const include = {
  acceptedQuote: true,
  payment: { include: paymentActivity },
  selectedPro: { include: { user: { select: { suspendedAt: true, role: true } } } },
} satisfies Prisma.ServiceRequestInclude;
type Booking = Prisma.ServiceRequestGetPayload<{ include: typeof include }>;

function editable(request: Booking) {
  invariant(request.state === "BOOKED" && request.acceptedQuote?.state === "ACCEPTED" &&
    request.acceptedProfileId === request.selectedProfileId && request.payment && paymentUntouched(request.payment),
    "BOOKING_LOCKED", 409, "Ndryshimi i orarit lejohet vetëm para fillimit të pagesës. Kontaktoni mbështetjen.");
}

export async function proposeReschedule(actor: Actor, id: string, input: unknown) {
  entityId.parse(id);
  invariant(actor.role === "PRO" && actor.proProfile, "FORBIDDEN", 403, "Vetëm profesionisti propozon orarin e ri.");
  const data = proposalInput.parse(input);
  assertNoContact(data.timing);
  await enforceLimit(`reschedule:${actor.id}`, 30, 60 * 60_000);
  const creationKey = hashToken(`reschedule:${actor.id}:${data.clientKey}`);
  return serializable(async tx => {
    const request = await tx.serviceRequest.findUnique({ where: { id }, include });
    invariant(request && isParticipant(request, actor), "NOT_FOUND", 404, "Kërkesa nuk u gjet.");
    const previous = await tx.quote.findUnique({ where: { creationKey } });
    if (previous) {
      invariant(previous.requestId === id, "STALE", 409, "Rifreskoni faqen dhe provoni përsëri.");
      return { ok: true, quoteId: previous.id };
    }
    editable(request);
    invariant(request.version === data.expectedVersion, "STALE", 409, "Kërkesa ka ndryshuar. Rifreskoni faqen.");
    invariant(request.selectedPro?.verification === "APPROVED" &&
      !request.selectedPro.user.suspendedAt && request.selectedPro.user.role === "PRO",
      "PRO_UNAVAILABLE", 409, "Profesionisti nuk është i disponueshëm.");
    const scheduledAt = new Date(data.scheduledAt), expiresAt = new Date(data.expiresAt);
    invariant(expiresAt.getTime() > Date.now() + 60_000 && expiresAt.getTime() <= Date.now() + 30 * 86400000 &&
      scheduledAt > expiresAt && scheduledAt.getTime() !== request.acceptedQuote!.scheduledAt?.getTime(),
      "TIMING", 400, "Zgjidhni orar të ri; propozimi duhet të skadojë para tij, brenda 30 ditëve.");
    const original = request.acceptedQuote!;
    await assertAppointmentAvailable(tx, original.profileId, scheduledAt, original.duration ?? "", id);
    const revision = (await tx.quote.aggregate({ where: { requestId: id }, _max: { revision: true } }))._max.revision!;
    await tx.quote.updateMany({ where: { requestId: id, state: "SENT" }, data: { state: "WITHDRAWN" } });
    const quote = await tx.quote.create({ data: {
      requestId: id, profileId: original.profileId, amount: original.amount,
      lines: original.lines as Prisma.InputJsonValue, message: original.message,
      duration: original.duration, warranty: original.warranty, expectedDays: original.expectedDays,
      availableAt: data.timing, scheduledAt, expiresAt, revision: revision + 1, creationKey,
    } });
    await tx.serviceRequest.update({ where: { id }, data: { version: { increment: 1 } } });
    await notify(tx, request.clientId, "RESCHEDULE_PROPOSED", "Profesionisti propozoi orar të ri", `/llogaria/kerkesat/${id}`);
    await tx.auditLog.create({ data: { actorId: actor.id, action: "RESCHEDULE_PROPOSED", target: id,
      meta: { quoteId: quote.id, previousQuoteId: original.id } } });
    return { ok: true, quoteId: quote.id };
  });
}

export async function decideReschedule(actor: Actor, id: string, input: unknown) {
  entityId.parse(id);
  const data = decisionInput.parse(input);
  invariant(actor.role === (data.action === "WITHDRAW" ? "PRO" : "CLIENT"), "FORBIDDEN", 403, "Nuk keni qasje në këtë veprim.");
  return serializable(async tx => {
    const request = await tx.serviceRequest.findUnique({ where: { id }, include });
    invariant(request && isParticipant(request, actor), "NOT_FOUND", 404, "Kërkesa nuk u gjet.");
    const quote = await tx.quote.findFirst({ where: { id: data.quoteId, requestId: id, profileId: request.acceptedProfileId ?? "" } });
    invariant(quote, "NOT_FOUND", 404, "Propozimi nuk u gjet.");
    const resultState = data.action === "ACCEPT" ? "ACCEPTED" : data.action === "DECLINE" ? "DECLINED" : "WITHDRAWN";
    if (quote.state === resultState && (data.action !== "ACCEPT" || request.acceptedQuoteId === quote.id)) return { ok: true };
    editable(request);
    invariant(request.version === data.expectedVersion && quote.state === "SENT" && quote.id !== request.acceptedQuoteId,
      "STALE", 409, "Propozimi ka ndryshuar. Rifreskoni faqen.");
    if (data.action === "ACCEPT") {
      invariant(quote.expiresAt && quote.expiresAt > new Date() && quote.scheduledAt && quote.scheduledAt > new Date(),
        "EXPIRED", 409, "Propozimi ka skaduar. Orari i mëparshëm mbetet në fuqi.");
      invariant(request.selectedPro?.verification === "APPROVED" && !request.selectedPro.user.suspendedAt && request.selectedPro.user.role === "PRO",
        "PRO_UNAVAILABLE", 409, "Profesionisti nuk është i disponueshëm.");
      const original = request.acceptedQuote!;
      invariant(quote.amount === original.amount && quote.amount === request.payment!.amount && quote.duration === original.duration &&
        quote.message === original.message && quote.warranty === original.warranty && quote.expectedDays === original.expectedDays &&
        JSON.stringify(quote.lines) === JSON.stringify(original.lines), "TERMS_CHANGED", 409, "Kushtet e ofertës kanë ndryshuar. Kontaktoni mbështetjen.");
      await assertAppointmentAvailable(tx, quote.profileId, quote.scheduledAt!, quote.duration ?? "", id);
      await tx.quote.update({ where: { id: original.id }, data: { state: "WITHDRAWN" } });
      // Touch the untouched payment inside this transaction, serializing against checkout's claim.
      await tx.payment.update({ where: { id: request.payment!.id }, data: { updatedAt: new Date() } });
    }
    await tx.quote.update({ where: { id: quote.id }, data: { state: resultState,
      ...(data.action === "ACCEPT" ? { acceptedAt: new Date() } : {}) } });
    await tx.serviceRequest.update({ where: { id }, data: { version: { increment: 1 },
      ...(data.action === "ACCEPT" ? { acceptedQuoteId: quote.id, scheduledAt: quote.scheduledAt } : {}) } });
    const recipient = data.action === "WITHDRAW" ? request.clientId : request.selectedPro!.userId;
    await notify(tx, recipient, `RESCHEDULE_${data.action}`, data.action === "ACCEPT" ? "Klienti pranoi orarin e ri" : "Propozimi i orarit u mbyll; orari i mëparshëm mbetet", `${data.action === "WITHDRAW" ? "/llogaria" : "/pro"}/kerkesat/${id}`);
    await tx.auditLog.create({ data: { actorId: actor.id, action: `RESCHEDULE_${data.action}`, target: id, meta: { quoteId: quote.id } } });
    return { ok: true };
  });
}
