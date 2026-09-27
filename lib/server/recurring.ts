import "server-only";
import type { Prisma, ServiceRequest } from "@prisma/client";
import { z } from "zod";
import type { Actor } from "./auth";
import { invariant } from "./errors";
import { serializable } from "./transaction";
import { hashToken } from "./tokens";
import { notify } from "./notifications";
import { requireActiveCategory } from "./service-catalog";
import { serviceCategory } from "../service-categories";
import { nextRecurringDate, readRecurrence, recurrenceLabels } from "../recurring-bookings";
import { entityId } from "../marketplace-validation";

const inputSchema = z.object({ cadence: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]) });
const repeatKey = (id: string) => hashToken(`recurring-next:${id}`);
const parentInclude = {
  payment: { include: { dispute: true } }, acceptedQuote: true,
  acceptedPro: { include: { user: { select: { suspendedAt: true, role: true } } } },
} satisfies Prisma.ServiceRequestInclude;

function settled(payment: { state: string; heldAt: Date | null; refundedAt: Date | null; dispute: unknown } | null) {
  return !!payment && ["HELD", "RELEASED"].includes(payment.state) && !!payment.heldAt && !payment.refundedAt && !payment.dispute;
}

/** Eligibility is derived only from a server-created link to the customer's
 * completed, funded job with this same pro and category. No client tier flags. */
export async function eligibleRecurringBooking(tx: Prisma.TransactionClient,
  request: Pick<ServiceRequest, "id" | "clientId" | "categorySlug" | "selectedProfileId" | "answers" | "creationKey">,
  scheduledAt: Date | null) {
  const recurrence = readRecurrence(request.answers);
  if (!recurrence || request.creationKey !== repeatKey(recurrence.parentRequestId) || !scheduledAt) return false;
  const parent = await tx.serviceRequest.findUnique({ where: { id: recurrence.parentRequestId }, include: parentInclude });
  return !!parent && parent.state === "COMPLETED" && !!parent.completedAt &&
    parent.clientId === request.clientId && parent.acceptedProfileId === request.selectedProfileId &&
    serviceCategory(parent.categorySlug)?.slug === serviceCategory(request.categorySlug)?.slug &&
    parent.acceptedPro?.verification === "APPROVED" && !parent.acceptedPro.user.suspendedAt &&
    parent.acceptedPro.user.role === "PRO" &&
    serviceCategory(parent.acceptedPro.categorySlug)?.slug === serviceCategory(request.categorySlug)?.slug &&
    settled(parent.payment) && !!parent.acceptedQuote?.scheduledAt &&
    scheduledAt.toISOString() === recurrence.scheduledAt &&
    nextRecurringDate(parent.acceptedQuote.scheduledAt, recurrence.cadence).toISOString() === recurrence.scheduledAt;
}

/** One next visit per completed job. Each visit still requires a private offer,
 * explicit customer acceptance and checkout; no automatic card charge. */
export async function createRecurringRequest(actor: Actor, id: string, input: unknown) {
  invariant(actor.role === "CLIENT", "FORBIDDEN", 403, "Ky veprim është për klientin.");
  entityId.parse(id);
  const { cadence } = inputSchema.parse(input);
  return serializable(async tx => {
    const parent = await tx.serviceRequest.findUnique({ where: { id }, include: parentInclude });
    invariant(parent && parent.clientId === actor.id, "NOT_FOUND", 404, "Rezervimi nuk u gjet.");
    const existing = await tx.serviceRequest.findUnique({ where: { creationKey: repeatKey(id) } });
    if (existing) {
      invariant(readRecurrence(existing.answers)?.cadence === cadence, "RECURRENCE_EXISTS", 409,
        "Vizita pasuese është kërkuar tashmë me një shpeshtësi tjetër.");
      return { ok: true, id: existing.id, redirect: `/llogaria/kerkesat/${existing.id}` };
    }
    invariant(parent.state === "COMPLETED" && parent.completedAt && settled(parent.payment) &&
      parent.acceptedPro?.verification === "APPROVED" && parent.acceptedPro.user.role === "PRO" &&
      !parent.acceptedPro.user.suspendedAt && parent.acceptedQuote?.scheduledAt,
      "RECURRENCE_UNAVAILABLE", 409, "Përsëritja kërkon një punë të përfunduar dhe një pagesë të konfirmuar pa kontest.");
    const category = await requireActiveCategory(parent.categorySlug, tx);
    invariant(serviceCategory(parent.acceptedPro.categorySlug)?.slug === category.slug,
      "CATEGORY", 409, "Kategoria e profesionistit ka ndryshuar.");
    const scheduledAt = nextRecurringDate(parent.acceptedQuote.scheduledAt, cadence);
    invariant(scheduledAt.getTime() > Date.now() + 60_000, "TIMING", 409,
      "Orari pasues ka kaluar. Dërgoni një kërkesë të re për një orar tjetër.");
    const next = await tx.serviceRequest.create({ data: {
      clientId: actor.id, selectedProfileId: parent.acceptedProfileId, categorySlug: category.slug,
      title: parent.title, detail: parent.detail, city: parent.city, address: parent.address,
      timing: `${recurrenceLabels[cadence]} · ${scheduledAt.toLocaleString("sq-AL", { timeZone: "Europe/Belgrade" })}`,
      state: "OPEN", creationKey: repeatKey(id), conversation: { create: {} },
      answers: { recurrence: { version: 1, parentRequestId: parent.id, cadence, scheduledAt: scheduledAt.toISOString() } },
    } });
    await notify(tx, parent.acceptedPro.userId, "INQUIRY", "Kërkesë për vizitën e radhës", `/pro/kerkesat/${next.id}`);
    await tx.auditLog.create({ data: { actorId: actor.id, action: "RECURRING_VISIT_REQUESTED", target: next.id,
      meta: { parentRequestId: id, cadence, scheduledAt: scheduledAt.toISOString() } } });
    return { ok: true, id: next.id, redirect: `/llogaria/kerkesat/${next.id}` };
  });
}
