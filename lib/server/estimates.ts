import "server-only";
import { z } from "zod";
import type { Actor } from "./auth";
import { invariant } from "./errors";
import { notify } from "./notifications";
import { enforceLimit } from "./rate-limit";
import { hashToken } from "./tokens";
import { serializable } from "./transaction";
import { requireActiveCategory } from "./service-catalog";
import { categoryFlow } from "./bookings";
import { containsContactDetails } from "../contact-filter";
import { clientKey, cleanText, entityId } from "../marketplace-validation";
import { money, dateTime } from "../format";
import { estimateSplit } from "../book-now";

/** Paid estimate visit (step 4): Elektricist and Mjeshtër i Ujit by default
 * (Category.estimateEnabled overrides). The customer requests a visit in a
 * chat with the pro; in the beta an admin marks the €15 as paid. A PAID
 * estimate is credited in full to the next hire with the same pro, on any path
 * (Book now or the chat offer), once: the customer pays total − €15 and the
 * commission stays on the full price (see estimateCredit/priceJob in lib/book-now). */
export const estimateInput = z.object({
  profileId: entityId,
  clientKey,
  visitAt: z.string().datetime(),
  detail: cleanText(10, 4000),
  city: cleanText(1, 60),
  address: z.string().trim().max(300).optional(),
});

export { estimateStateLabels } from "../estimate-labels";

export async function requestEstimate(actor: Actor, input: unknown) {
  invariant(actor.role === "CLIENT", "FORBIDDEN", 403, "Nuk keni qasje në këtë veprim.");
  const data = estimateInput.parse(input);
  invariant(!containsContactDetails(data.detail), "CONTACT_DETAILS", 400,
    "Mos shkruani numra telefoni, email, lidhje ose rrjete sociale. Adresën e shënoni në fushën e saj.");
  const visitAt = new Date(data.visitAt), now = new Date();
  invariant(visitAt.getTime() > now.getTime() + 60 * 60_000 && visitAt.getTime() < now.getTime() + 60 * 86_400_000, "TIMING", 400,
    "Zgjidhni një orë vizite së paku një orë nga tani dhe brenda 60 ditëve.");
  await enforceLimit(`estimate:${actor.id}`, 10, 60 * 60_000);
  const creationKey = hashToken(`estimate:${actor.id}:${data.clientKey}`);
  return serializable(async (tx) => {
    const previous = await tx.estimate.findUnique({ where: { creationKey } });
    if (previous?.requestId) return { ok: true, id: previous.requestId, redirect: `/llogaria/kerkesat/${previous.requestId}` };
    const profile = await tx.proProfile.findFirst({ where: { id: data.profileId, verification: "APPROVED", user: { suspendedAt: null, role: "PRO" } } });
    invariant(profile && profile.userId !== actor.id, "PRO_UNAVAILABLE", 409, "Ky profesionist nuk pranon kërkesa për momentin.");
    const category = await requireActiveCategory(profile.categorySlug, tx);
    const flow = await categoryFlow(tx, category.slug);
    invariant(flow.estimate && flow.estimatePriceCents, "ESTIMATE_UNAVAILABLE", 409, "Vizita e vlerësimit nuk ofrohet në këtë kategori. Filloni një bisedë me profesionistin.");
    const open = await tx.estimate.findFirst({ where: { clientId: actor.id, profileId: profile.id, state: { in: ["PENDING", "PAID"] } } });
    invariant(!open, "ESTIMATE_EXISTS", 409, open?.state === "PAID"
      ? "Keni një vlerësim të paguar me këtë profesionist; ai zbritet kur e punësoni."
      : "Keni një kërkesë vlerësimi në pritje me këtë profesionist. Vazhdoni në bisedë.");
    const request = await tx.serviceRequest.create({ data: {
      clientId: actor.id, selectedProfileId: profile.id, categorySlug: category.slug,
      title: `Vizitë vlerësimi · ${money(flow.estimatePriceCents)}`, detail: data.detail, city: data.city, address: data.address || null,
      timing: `Vizitë vlerësimi · ${dateTime(visitAt)}`, answers: { estimate: { version: 1, visitAt: visitAt.toISOString() } },
      state: "OPEN", creationKey: hashToken(`estimate-request:${creationKey}`), conversation: { create: {} },
    } });
    const estimate = await tx.estimate.create({ data: {
      clientId: actor.id, profileId: profile.id, requestId: request.id, amountCents: flow.estimatePriceCents,
      state: "PENDING", visitAt, creationKey,
    } });
    await notify(tx, profile.userId, "ESTIMATE", `Kërkesë për vizitë vlerësimi (${money(flow.estimatePriceCents)}); pagesa është në pritje`, `/pro/kerkesat/${request.id}`);
    await tx.auditLog.create({ data: { actorId: actor.id, action: "ESTIMATE_REQUESTED", target: estimate.id,
      meta: { requestId: request.id, amountCents: flow.estimatePriceCents, visitAt: visitAt.toISOString() } } });
    return { ok: true, id: request.id, redirect: `/llogaria/kerkesat/${request.id}` };
  });
}

const adminInput = z.object({ action: z.enum(["MARK_PAID", "REFUND", "CANCEL"]), id: entityId, reason: z.string().max(500).optional() });

/** Beta (payments off): an admin records that the customer paid the estimate
 * outside Zgjoi, refunds a paid one that was not used, or cancels a request. */
export async function adminEstimateAction(actor: Actor, input: unknown) {
  invariant(actor.role === "ADMIN", "FORBIDDEN", 403, "Nuk keni qasje.");
  const data = adminInput.parse(input);
  const note = (data.reason ?? "").trim().replace(/\s+/g, " ");
  invariant(note.length >= 10 && note.length <= 500, "NOTE", 400,
    data.action === "MARK_PAID" ? "Shënoni si u pagua (p.sh. para në dorë, transfer bankar me referencë), 10–500 shkronja." : "Shënoni arsyen, 10–500 shkronja.");
  return serializable(async (tx) => {
    invariant(await tx.user.findFirst({ where: { id: actor.id, role: "ADMIN", suspendedAt: null } }), "FORBIDDEN", 403, "Nuk keni qasje.");
    const estimate = await tx.estimate.findUnique({ where: { id: data.id }, include: { profile: { select: { userId: true } } } });
    invariant(estimate, "NOT_FOUND", 404, "Vlerësimi nuk u gjet.");
    const now = new Date();
    const href = (pro: boolean) => estimate.requestId ? `/${pro ? "pro" : "llogaria"}/kerkesat/${estimate.requestId}` : pro ? "/pro/paneli" : "/llogaria";
    if (data.action === "MARK_PAID") {
      if (["PAID", "CREDITED"].includes(estimate.state)) return { ok: true, already: true, message: "Vlerësimi ishte shënuar tashmë si i paguar." };
      invariant(estimate.state === "PENDING", "STATE", 409, "Ky vlerësim nuk është në pritje të pagesës.");
      const changed = await tx.estimate.updateMany({ where: { id: estimate.id, state: "PENDING" },
        data: { state: "PAID", paidAt: now, paidById: actor.id, paidNote: note, ...estimateSplit(estimate.amountCents) } });
      invariant(changed.count === 1, "STALE", 409, "Vlerësimi ka ndryshuar. Rifreskoni faqen.");
      await notify(tx, estimate.profile.userId, "ESTIMATE", "Pagesa e vlerësimit u konfirmua nga Zgjoi; vizita mund të bëhet", href(true));
      await notify(tx, estimate.clientId, "ESTIMATE", `Pagesa e vlerësimit (${money(estimate.amountCents)}) u konfirmua; zbritet nëse e punësoni profesionistin`, href(false));
    } else if (data.action === "REFUND") {
      invariant(estimate.state === "PAID" && !estimate.creditedRequestId, "STATE", 409, "Rimbursohet vetëm një vlerësim i paguar që nuk është zbritur nga një punë.");
      await tx.estimate.update({ where: { id: estimate.id }, data: { state: "REFUNDED", refundedAt: now, proShareCents: null, platformShareCents: null } });
      await notify(tx, estimate.clientId, "ESTIMATE", "Vlerësimi u rimbursua nga Zgjoi", href(false));
    } else {
      invariant(estimate.state === "PENDING", "STATE", 409, "Anulohet vetëm një vlerësim i papaguar.");
      await tx.estimate.update({ where: { id: estimate.id }, data: { state: "CANCELLED", cancelledAt: now, cancelledBy: "ADMIN" } });
      await notify(tx, estimate.clientId, "ESTIMATE", "Kërkesa për vlerësim u anulua nga Zgjoi", href(false));
    }
    await tx.auditLog.create({ data: { actorId: actor.id, action: `ESTIMATE_${data.action}`, target: estimate.id,
      meta: { amountCents: estimate.amountCents, requestId: estimate.requestId, note,
        ...(data.action === "MARK_PAID" ? { split: estimateSplit(estimate.amountCents) } : {}) } } });
    return { ok: true, message: data.action === "MARK_PAID" ? "Vlerësimi u shënua si i paguar." : data.action === "REFUND" ? "Vlerësimi u shënua si i rimbursuar." : "Kërkesa u anulua." };
  });
}

/** The customer withdraws an unpaid estimate request. */
export async function cancelEstimate(actor: Actor, id: string) {
  invariant(actor.role === "CLIENT", "FORBIDDEN", 403, "Nuk keni qasje në këtë veprim.");
  entityId.parse(id);
  return serializable(async (tx) => {
    const estimate = await tx.estimate.findUnique({ where: { id }, include: { profile: { select: { userId: true } } } });
    invariant(estimate && estimate.clientId === actor.id, "NOT_FOUND", 404, "Vlerësimi nuk u gjet.");
    if (estimate.state === "CANCELLED") return { ok: true };
    invariant(estimate.state === "PENDING", "STATE", 409, "Vlerësimi është paguar tashmë. Për rimbursim kontaktoni ndihmën e Zgjoi.");
    await tx.estimate.update({ where: { id }, data: { state: "CANCELLED", cancelledAt: new Date(), cancelledBy: "CLIENT" } });
    if (estimate.requestId) await notify(tx, estimate.profile.userId, "ESTIMATE", "Klienti anuloi kërkesën për vlerësim", `/pro/kerkesat/${estimate.requestId}`);
    await tx.auditLog.create({ data: { actorId: actor.id, action: "ESTIMATE_CANCELLED", target: id } });
    return { ok: true, message: "Kërkesa për vlerësim u anulua." };
  });
}
