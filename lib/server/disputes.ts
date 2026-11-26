import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { Actor } from "./auth";
import { serializable, isParticipant } from "./marketplace";
import { invariant } from "./errors";
import { notify } from "./notifications";
import { entityId, cleanText, euroAmount } from "../marketplace-validation";
import { canOpenDispute, responseDeadline, readyForDecision, settleDispute, outcomeLabels, DISPUTE_OPEN_DAYS, type DisputeOutcome } from "../dispute-rules";
import { money } from "../format";
import { checkCancellationAlert } from "./trust";

const jobHref = (role: "CLIENT" | "PRO", id: string) => `${role === "PRO" ? "/pro" : "/llogaria"}/kerkesat/${id}`;

/** Either side flags a paid job with a written statement; admins are notified. */
export async function openDispute(actor: Actor, input: unknown) {
  const data = z.object({ requestId: entityId, reason: cleanText(20, 4000) }).parse(input);
  return serializable(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id: data.requestId },
      include: { payment: { include: { dispute: true } }, selectedPro: { select: { userId: true } } },
    });
    invariant(request && isParticipant(request, actor), "NOT_FOUND", 404, "Kërkesa nuk u gjet.");
    return createDispute(tx, actor, request, data.reason);
  });
}

type DisputeJob = Prisma.ServiceRequestGetPayload<{ include: { payment: { include: { dispute: true } }; selectedPro: { select: { userId: true } } } }>;
/** Opens a dispute inside an existing transaction (also used when a customer
 * reports a no-show although the pro checked in with “Arrita”). */
export async function createDispute(tx: Prisma.TransactionClient, actor: Actor, request: DisputeJob, reason: string) {
  if (request.payment?.dispute) return { ok: true, id: request.payment.dispute.id };
  invariant(request.payment?.state === "HELD" && !request.payment.operation, "STATE", 409, "Për këtë pagesë kontaktoni mbështetjen për shqyrtim.");
  const now = new Date();
  invariant(canOpenDispute(request, now), "DISPUTE_WINDOW", 409, `Një problem mund të raportohet deri në ${DISPUTE_OPEN_DAYS} ditë pas punës. Kontaktoni mbështetjen.`);
  const role = actor.role === "PRO" ? "PRO" : "CLIENT";
  const dispute = await tx.dispute.create({ data: {
    paymentId: request.payment.id, openedById: actor.id, openedByRole: role, reason,
    priorState: request.state, respondBy: responseDeadline(now),
  } });
  await tx.payment.update({ where: { id: request.payment.id }, data: { state: "DISPUTED" } });
  await tx.serviceRequest.update({ where: { id: request.id }, data: { state: "DISPUTED", version: { increment: 1 } } });
  const other = role === "PRO" ? request.clientId : request.selectedPro?.userId;
  if (other) await notify(tx, other, "DISPUTE", "U hap një kontest për punën; shtoni deklaratën tuaj brenda 48 orëve", jobHref(role === "PRO" ? "CLIENT" : "PRO", request.id));
  const admins = await tx.user.findMany({ where: { role: "ADMIN", suspendedAt: null }, select: { id: true } });
  for (const admin of admins) await notify(tx, admin.id, "DISPUTE", "Një kontest kërkon shqyrtim", `/admin/kontestet/${dispute.id}`);
  await tx.auditLog.create({ data: { actorId: actor.id, action: "DISPUTE_OPENED", target: request.id, meta: { disputeId: dispute.id, role } } });
  return { ok: true, id: dispute.id };
}

/** The other side adds their statement, once, within 48 hours. */
export async function respondDispute(actor: Actor, input: unknown) {
  const data = z.object({ requestId: entityId, statement: cleanText(20, 4000) }).parse(input);
  return serializable(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id: data.requestId },
      include: { payment: { include: { dispute: true } }, selectedPro: { select: { userId: true } } },
    });
    invariant(request && isParticipant(request, actor), "NOT_FOUND", 404, "Kërkesa nuk u gjet.");
    const dispute = request.payment?.dispute;
    invariant(dispute && !dispute.resolvedAt, "NOT_FOUND", 404, "Nuk ka kontest të hapur.");
    invariant(dispute.openedById !== actor.id, "FORBIDDEN", 403, "Deklaratën e dytë e shton pala tjetër.");
    if (dispute.response) return { ok: true, id: dispute.id };
    invariant(!dispute.respondBy || dispute.respondBy > new Date(), "LATE", 409, "Afati prej 48 orësh ka kaluar. Administrata vendos me të dhënat ekzistuese.");
    await tx.dispute.update({ where: { id: dispute.id }, data: { response: data.statement, respondedById: actor.id, respondedAt: new Date() } });
    const admins = await tx.user.findMany({ where: { role: "ADMIN", suspendedAt: null }, select: { id: true } });
    for (const admin of admins) await notify(tx, admin.id, "DISPUTE", "Pala tjetër shtoi deklaratën në kontest", `/admin/kontestet/${dispute.id}`);
    await tx.auditLog.create({ data: { actorId: actor.id, action: "DISPUTE_RESPONDED", target: request.id, meta: { disputeId: dispute.id } } });
    return { ok: true, id: dispute.id, message: "Deklarata juaj u shtua. Administrata do të vendosë." };
  });
}

export const decisionInput = z.object({
  outcome: z.enum(["FULL_REFUND", "PARTIAL_REFUND", "CREDIT", "NO_ACTION"]),
  finalPrice: euroAmount.optional(),
  customerCredit: euroAmount.optional(),
  resolution: cleanText(10, 2000),
});

/** Admin decision: refund (full/partial), credit or no action, with an optional final price. */
export async function decideDispute(actor: Actor, disputeId: string, input: unknown) {
  invariant(actor.role === "ADMIN", "FORBIDDEN", 403, "Nuk keni qasje.");
  entityId.parse(disputeId);
  const data = decisionInput.parse(input);
  return serializable(async (tx) => {
    invariant(await tx.user.findFirst({ where: { id: actor.id, role: "ADMIN", suspendedAt: null } }), "FORBIDDEN", 403, "Nuk keni qasje.");
    const dispute = await tx.dispute.findUnique({ where: { id: disputeId },
      include: { payment: { include: { request: { include: { booking: true, selectedPro: { select: { userId: true } } } } } } } });
    invariant(dispute, "NOT_FOUND", 404, "Kontesti nuk u gjet.");
    if (dispute.resolvedAt) return { ok: true, already: true };
    const now = new Date();
    invariant(readyForDecision(dispute, now), "WAITING", 409, "Pala tjetër ka ende kohë të shtojë deklaratën (48 orë).");
    const payment = dispute.payment, request = payment.request;
    const paidCents = payment.provider === "offline" || payment.heldAt ? Math.max(0, payment.amount - payment.estimateCreditCents) : 0;
    let s;
    try {
      s = settleDispute({ amountCents: payment.amount, commissionBps: payment.commissionBps, estimateCreditCents: payment.estimateCreditCents,
        paidCents, outcome: data.outcome as DisputeOutcome, finalPriceCents: data.finalPrice, customerCreditCents: data.customerCredit });
    } catch (error) {
      invariant(false, "DECISION", 400, data.outcome === "PARTIAL_REFUND" ? "Për rimbursim të pjesshëm caktoni një çmim përfundimtar më të ulët se totali."
        : data.outcome === "CREDIT" ? "Caktoni shumën e kredisë për klientin." : String((error as Error).message));
    }
    await tx.dispute.update({ where: { id: dispute.id }, data: {
      outcome: data.outcome, resolution: data.resolution, resolvedAt: now, decidedById: actor.id,
      finalPriceCents: s.endsJob ? null : s.finalPriceCents, refundCents: s.refundCents, customerCreditCents: s.customerCreditCents,
      todoKind: s.todo?.kind ?? null, todoCents: s.todo?.cents ?? null,
    } });
    if (s.endsJob) {
      await tx.payment.update({ where: { id: payment.id }, data: { state: s.todo ? "REFUND_PENDING" : "REFUNDED", ...(s.todo ? {} : { refundedAt: now }) } });
      await tx.serviceRequest.update({ where: { id: request.id }, data: { state: "CANCELLED", cancelledAt: now, cancelledBy: "DISPUTE_REFUND", version: { increment: 1 } } });
      if (request.acceptedProfileId) await checkCancellationAlert(tx, request.acceptedProfileId, now);
    } else {
      await tx.payment.update({ where: { id: payment.id }, data: { state: "HELD", amount: s.finalPriceCents, commissionAmount: s.commissionCents, proAmount: s.proCents } });
      const prior = dispute.priorState && ["BOOKED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(dispute.priorState) ? dispute.priorState : "IN_PROGRESS";
      await tx.serviceRequest.update({ where: { id: request.id }, data: { state: prior as "BOOKED", version: { increment: 1 } } });
      if (request.booking && s.finalPriceCents !== payment.amount)
        await tx.booking.update({ where: { id: request.booking.id }, data: { totalCents: s.finalPriceCents, commissionCents: s.commissionCents, proCents: s.proCents,
          dueCents: Math.max(0, s.finalPriceCents - request.booking.creditCents) } });
      await tx.payout.updateMany({ where: { paymentId: payment.id, state: "SCHEDULED" }, data: { amount: s.proCents } });
    }
    const label = `Vendimi i administratës: ${outcomeLabels[data.outcome as DisputeOutcome]}` +
      (s.refundCents ? ` · rimbursim ${money(s.refundCents)}` : "") + (s.customerCreditCents ? ` · kredi ${money(s.customerCreditCents)}` : "") +
      (!s.endsJob && s.finalPriceCents !== payment.amount ? ` · çmimi përfundimtar ${money(s.finalPriceCents)}` : "");
    await notify(tx, request.clientId, "DISPUTE_DECIDED", label, jobHref("CLIENT", request.id));
    if (request.selectedPro) await notify(tx, request.selectedPro.userId, "DISPUTE_DECIDED", label, jobHref("PRO", request.id));
    await tx.auditLog.create({ data: { actorId: actor.id, action: "DISPUTE_DECIDED", target: request.id,
      meta: { disputeId: dispute.id, outcome: data.outcome, ...s, label } } });
    return { ok: true, message: label };
  });
}

export async function completeDisputeTodo(actor: Actor, disputeId: string, note: string) {
  invariant(actor.role === "ADMIN", "FORBIDDEN", 403, "Nuk keni qasje.");
  entityId.parse(disputeId);
  const clean = note.trim().replace(/\s+/g, " ");
  invariant(clean.length >= 5 && clean.length <= 500, "NOTE", 400, "Shënoni si u krye (5–500 shkronja).");
  return serializable(async (tx) => {
    const d = await tx.dispute.findUnique({ where: { id: disputeId }, include: { payment: true } });
    invariant(d && d.todoKind, "NOT_FOUND", 404, "Detyra nuk u gjet.");
    if (d.todoDoneAt) return { ok: true, already: true };
    await tx.dispute.update({ where: { id: d.id }, data: { todoDoneAt: new Date(), todoDoneById: actor.id } });
    if (d.outcome === "FULL_REFUND" && d.payment.state === "REFUND_PENDING")
      await tx.payment.update({ where: { id: d.paymentId }, data: { state: "REFUNDED", refundedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "DISPUTE_TODO_DONE", target: d.id, meta: { todoKind: d.todoKind, todoCents: d.todoCents, note: clean } } });
    return { ok: true, message: "Detyra u shënua si e kryer." };
  });
}
