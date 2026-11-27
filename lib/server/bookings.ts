import "server-only";
import { proUserWhere, requireIdApproved } from "./id-verification";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { type Actor } from "./auth";
import { invariant } from "./errors";
import { notify } from "./notifications";
import { enforceLimit } from "./rate-limit";
import { hashToken } from "./tokens";
import { serializable } from "./transaction";
import { resolveProCategory } from "./pro-categories";
import { bookingCommission } from "./commissions";
import { assertAppointmentAvailable } from "./appointments";
import { containsContactDetails } from "../contact-filter";
import { serviceCategory, categorySlugs } from "../service-categories";
import {
  hiringFlow, checkHours, bookingTotal, priceJob, estimateCredit, cancellationOutcome, adjustmentTodo,
  hoursLabel, returnsEstimateCredit, MINUTE_STEP, MIN_RATE_CENTS, MAX_RATE_CENTS, type CancelReason, bookingMinimum, validMinMinutes, DEFAULT_MIN_MINUTES,
  estimateSplit,
} from "../book-now";
import { clientKey, cleanText, entityId, euroAmount } from "../marketplace-validation";
import { money, clockTime } from "../format";
import { checkCancellationAlert } from "./trust";
import { createDispute } from "./disputes";
import { nobodyHomeGate, noShowGate, NO_SHOW_AFTER_MINUTES } from "../arrival";
import { SERIES_CADENCES, seriesLabel } from "../recurring-series";
import { createSeriesRow, proposeSeriesFromBooking } from "./recurring-series";

type FlowDB = Pick<Prisma.TransactionClient, "category">;
/** Per-category hiring paths: code default, overridden by the Category row. */
export async function categoryFlow(tx: FlowDB, slug: string) {
  const category = serviceCategory(slug);
  const rows = category ? await tx.category.findMany({ where: { slug: { in: categorySlugs(slug) } } }) : [];
  const row = rows.find(r => r.slug === category?.slug) ?? rows[0];
  return hiringFlow(slug, row ?? {});
}

function noContact(text: string) {
  invariant(!containsContactDetails(text), "CONTACT_DETAILS", 400,
    "Mos shkruani numra telefoni, email, lidhje ose rrjete sociale. Adresën e shënoni në fushën e saj.");
}

/* -------------------------------------------------- pro rate settings */

export const bookingSettingsInput = z.object({
  enabled: z.union([z.boolean(), z.enum(["true", "false", "on"])]).transform(v => v === true || v === "true" || v === "on"),
  hourlyRate: euroAmount.optional(),
  minMinutes: z.coerce.number().int().optional(),
});

export async function saveBookingSettings(actor: Actor, input: unknown) {
  invariant(actor.role === "PRO" && actor.proProfile, "FORBIDDEN", 403, "Nuk keni qasje në këtë veprim.");
  const data = bookingSettingsInput.parse(input);
  const profile = actor.proProfile;
  return serializable(async (tx) => {
    // One hourly rate for every profession of this pro that offers Book now.
    const rows = await tx.proCategory.findMany({ where: { profileId: profile.id }, select: { categorySlug: true } });
    const bookNow = (await Promise.all(rows.map((r) => categoryFlow(tx, r.categorySlug)))).some((f) => f.bookNow);
    invariant(bookNow || !data.enabled, "BOOK_NOW_UNAVAILABLE", 409, "“Rezervo tani” nuk ofrohet në kategorinë tuaj. Klientët ju shkruajnë në bisedë.");
    // Minimum hours are set per profession in the professions panel. This value is the pro's
    // fallback for professions without their own minimum (kept when not sent; 2 h for a first rate).
    const current = await tx.proProfile.findUniqueOrThrow({ where: { id: profile.id }, select: { bookingMinMinutes: true } });
    const fallbackMin = data.minMinutes ?? current.bookingMinMinutes ?? DEFAULT_MIN_MINUTES;
    if (data.enabled) {
      invariant(data.hourlyRate && data.hourlyRate >= MIN_RATE_CENTS && data.hourlyRate <= MAX_RATE_CENTS, "RATE", 400,
        `Tarifa për orë duhet të jetë nga ${money(MIN_RATE_CENTS)} deri në ${money(MAX_RATE_CENTS)}.`);
      invariant(validMinMinutes(fallbackMin), "MIN_HOURS", 400,
        "Zgjidhni minimumin e orëve (nga 0,5 deri në 12 orë).");
    }
    await tx.proProfile.update({ where: { id: profile.id }, data: data.enabled
      ? { hourlyRateCents: data.hourlyRate!, bookingMinMinutes: fallbackMin }
      : { hourlyRateCents: null, bookingMinMinutes: null } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "BOOKING_SETTINGS_UPDATED", target: profile.id,
      meta: { enabled: data.enabled, hourlyRateCents: data.enabled ? data.hourlyRate : null, minMinutes: data.enabled ? fallbackMin : null } } });
    return { ok: true, message: data.enabled ? "Tarifa u ruajt. Klientët mund t’ju rezervojnë me “Rezervo tani”." : "“Rezervo tani” u çaktivizua." };
  });
}

/** Public: whether a profession of this pro can be booked right now, and on what terms. One hourly
 * rate per pro; the minimum is the profession's own (`row.minMinutes`), else the pro's default. */
export function bookableTerms(profile: { hourlyRateCents: number | null; bookingMinMinutes: number | null },
  flow: { bookNow: boolean }, row?: { minMinutes?: number | null } | null) {
  const minMinutes = bookingMinimum(row?.minMinutes, profile.bookingMinMinutes);
  return flow.bookNow && profile.hourlyRateCents && minMinutes
    ? { rateCents: profile.hourlyRateCents, minMinutes } : null;
}

/** bookableTerms for one category of a pro, reading that profession's row. */
export async function bookingTermsFor(tx: Pick<Prisma.TransactionClient, "category" | "proCategory">,
  profile: { id: string; hourlyRateCents: number | null; bookingMinMinutes: number | null }, slug: string) {
  const [flow, row] = await Promise.all([
    categoryFlow(tx, slug),
    tx.proCategory.findFirst({ where: { profileId: profile.id, categorySlug: { in: categorySlugs(slug) } }, select: { minMinutes: true } }),
  ]);
  return bookableTerms(profile, flow, row);
}

/* ------------------------------------------------------ book now */

export const bookNowInput = z.object({
  profileId: entityId,
  categorySlug: cleanText(1, 80).optional(),
  clientKey,
  startsAt: z.string().datetime(),
  minutes: z.coerce.number().int(),
  detail: cleanText(10, 4000),
  city: cleanText(1, 60),
  address: z.string().trim().max(300).optional(),
  repeat: z.enum(["NONE", ...SERIES_CADENCES]).optional(),
});

async function creditEstimate(tx: Prisma.TransactionClient, clientId: string, profileId: string, requestId: string) {
  const candidates = await tx.estimate.findMany({ where: { clientId, profileId, state: "PAID", creditedRequestId: null } });
  const credit = estimateCredit(candidates, clientId, profileId);
  if (!credit.estimateId) return credit;
  const updated = await tx.estimate.updateMany({ where: { id: credit.estimateId, state: "PAID", creditedRequestId: null },
    // Credited to a hire: the 10 €/5 € no-hire split no longer applies.
    data: { state: "CREDITED", creditedRequestId: requestId, creditedAt: new Date(), proShareCents: null, platformShareCents: null } });
  invariant(updated.count === 1, "STALE", 409, "Kredia e vlerësimit ka ndryshuar. Provoni përsëri.");
  return credit;
}
/** Estimate credit on the chat path (acceptOffer). Book now applies it itself. */
export async function applyEstimateCreditToPayment(tx: Prisma.TransactionClient, request: { id: string; clientId: string }, profileId: string, paymentId: string) {
  const credit = await creditEstimate(tx, request.clientId, profileId, request.id);
  if (credit.creditCents) await tx.payment.update({ where: { id: paymentId }, data: { estimateCreditCents: credit.creditCents } });
  return credit;
}

export type BookNowInsert = {
  actorId: string; clientId: string; profile: { id: string; userId: string };
  categorySlug: string; rateCents: number; minMinutes: number; minutes: number; startsAt: Date;
  detail: string; city: string; address: string | null; creationKey: string; now: Date;
  series?: { id: string; occurrenceAt: Date; label: string };
};
/** Creates one Book now job: ServiceRequest (BOOKED) + accepted Quote + Payment
 * (PENDING, OFFLINE) + Booking. Shared by Book now and recurring occurrences. */
export async function insertBookNow(tx: Prisma.TransactionClient, b: BookNowInsert) {
  const totalCents = bookingTotal(b.rateCents, b.minutes);
  const label = `${hoursLabel(b.minutes)} × ${money(b.rateCents)}/orë`;
  const request = await tx.serviceRequest.create({ data: {
    clientId: b.clientId, selectedProfileId: b.profile.id, acceptedProfileId: b.profile.id, categorySlug: b.categorySlug,
    title: `${b.series ? "Rezervim i përsëritur" : "Rezervim"} · ${hoursLabel(b.minutes)}`, detail: b.detail, city: b.city, address: b.address,
    timing: b.series ? `Rezervo tani · ${b.series.label}` : "Rezervo tani",
    answers: { bookNow: { version: 1, minutes: b.minutes, rateCents: b.rateCents, ...(b.series ? { seriesId: b.series.id } : {}) } },
    state: "BOOKED", scheduledAt: b.startsAt, creationKey: hashToken(`booking-request:${b.creationKey}`), conversation: { create: {} },
  } });
  await assertAppointmentAvailable(tx, b.profile.id, b.startsAt, `${b.minutes} min`, request.id);
  const commission = await bookingCommission(tx, request, b.startsAt, true, b.now, b.series ? { seriesId: b.series.id, occurrenceAt: b.series.occurrenceAt } : {});
  const credit = await creditEstimate(tx, b.clientId, b.profile.id, request.id);
  const price = priceJob(totalCents, commission.bps, credit.creditCents);
  const quote = await tx.quote.create({ data: {
    requestId: request.id, profileId: b.profile.id, amount: totalCents,
    lines: [{ label, qty: b.minutes / 60, priceCents: b.rateCents }],
    message: `Rezervo tani · ${label}${b.series ? ` · ${b.series.label}` : ""}`, availableAt: "Rezervo tani", duration: `${b.minutes} min`,
    scheduledAt: b.startsAt, state: "ACCEPTED", acceptedAt: b.now, revision: 1,
  } });
  await tx.serviceRequest.update({ where: { id: request.id }, data: { acceptedQuoteId: quote.id, version: 1 } });
  await tx.payment.create({ data: {
    requestId: request.id, amount: totalCents, commissionBps: price.commissionBps, commissionAmount: price.commissionCents,
    proAmount: price.proCents, currency: "EUR", strategy: "PLATFORM_CHARGE", provider: "disabled", state: "PENDING",
    method: "OFFLINE", estimateCreditCents: price.creditCents,
  } });
  await tx.booking.create({ data: {
    requestId: request.id, profileId: b.profile.id, clientId: b.clientId, startsAt: b.startsAt,
    hourlyRateCents: b.rateCents, minMinutes: Math.min(b.minMinutes, b.minutes), minutes: b.minutes,
    totalCents, commissionBps: price.commissionBps, commissionCents: price.commissionCents, proCents: price.proCents,
    creditCents: price.creditCents, dueCents: price.dueCents, creationKey: b.creationKey,
    ...(b.series ? { seriesId: b.series.id, occurrenceAt: b.series.occurrenceAt } : {}),
  } });
  await notify(tx, b.profile.userId, "BOOKED", b.series
    ? "U krijua vizita e radhës e rezervimit të përsëritur; pagesa është në pritje"
    : "Keni një rezervim të ri me “Rezervo tani”; pagesa është në pritje", `/pro/kerkesat/${request.id}`);
  await tx.auditLog.create({ data: { actorId: b.actorId, action: b.series ? "RECURRING_OCCURRENCE_CREATED" : "BOOK_NOW_CREATED", target: request.id,
    meta: { minutes: b.minutes, rateCents: b.rateCents, totalCents, commission, creditCents: price.creditCents, estimateId: credit.estimateId,
      ...(b.series ? { seriesId: b.series.id, occurrenceAt: b.series.occurrenceAt.toISOString() } : {}) } } });
  return { requestId: request.id, totalCents, commissionBps: price.commissionBps };
}

export async function createBooking(actor: Actor, input: unknown) {
  invariant(actor.role === "CLIENT", "FORBIDDEN", 403, "Nuk keni qasje në këtë veprim.");
  await requireIdApproved(actor);
  const data = bookNowInput.parse(input);
  noContact(`${data.detail}`);
  const startsAt = new Date(data.startsAt), now = new Date();
  invariant(startsAt.getTime() > now.getTime() + 60 * 60_000 && startsAt.getTime() < now.getTime() + 60 * 86_400_000, "TIMING", 400,
    "Zgjidhni një fillim së paku një orë nga tani dhe brenda 60 ditëve.");
  await enforceLimit(`booking:${actor.id}`, 10, 60 * 60_000);
  const creationKey = hashToken(`booking:${actor.id}:${data.clientKey}`);
  return serializable(async (tx) => {
    const previous = await tx.booking.findUnique({ where: { creationKey } });
    if (previous) return { ok: true, id: previous.requestId, seriesId: previous.seriesId, redirect: `/llogaria/kerkesat/${previous.requestId}` };
    const profile = await tx.proProfile.findFirst({ where: { id: data.profileId, verification: "APPROVED", user: proUserWhere() },
      include: { user: { select: { id: true } } } });
    invariant(profile && profile.userId !== actor.id, "PRO_UNAVAILABLE", 409, "Ky profesionist nuk pranon rezervime për momentin.");
    const category = await resolveProCategory(tx, profile.id, data.categorySlug);
    const terms = await bookingTermsFor(tx, profile, category.slug);
    invariant(terms, "BOOK_NOW_UNAVAILABLE", 409, "Ky profesionist nuk pranon “Rezervo tani”. Filloni një bisedë me të.");
    const hours = checkHours(data.minutes, terms.minMinutes);
    invariant(hours.ok, "HOURS", 400, hours.ok ? "" : hours.message);
    // Recurring schedule chosen on the Book now form: the customer agrees to the
    // pro's public terms, so the series is active at once (like Book now itself).
    const series = data.repeat && data.repeat !== "NONE"
      ? await createSeriesRow(tx, { clientId: actor.id, profileId: profile.id, categorySlug: category.slug, cadence: data.repeat,
          firstStartsAt: startsAt, minutes: data.minutes, rateCents: terms.rateCents, detail: data.detail, city: data.city,
          address: data.address || null, proposedBy: "CLIENT", status: "ACTIVE", creationKey: hashToken(`series:${creationKey}`), now })
      : null;
    const created = await insertBookNow(tx, { actorId: actor.id, clientId: actor.id, profile, categorySlug: category.slug,
      rateCents: terms.rateCents, minMinutes: terms.minMinutes, minutes: data.minutes, startsAt, detail: data.detail, city: data.city,
      address: data.address || null, creationKey, now,
      ...(series ? { series: { id: series.id, occurrenceAt: startsAt, label: seriesLabel(series) } } : {}) });
    if (series) await tx.auditLog.create({ data: { actorId: actor.id, action: "RECURRING_SERIES_CREATED", target: series.id,
      meta: { cadence: series.cadence, weekday: series.weekday, startMinute: series.startMinute, minutes: series.minutes, rateCents: series.hourlyRateCents, firstRequestId: created.requestId } } });
    return { ok: true, id: created.requestId, seriesId: series?.id ?? null, redirect: `/llogaria/kerkesat/${created.requestId}` };
  });
}

/* ------------------------------------------------ changes and cancels */

export const bookingActionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("PROPOSE_HOURS"), clientKey, minutes: z.coerce.number().int(), note: z.string().trim().max(500).optional() }),
  z.object({ action: z.enum(["CONFIRM_HOURS", "DECLINE_HOURS"]), changeId: entityId }),
  z.object({ action: z.literal("PROPOSE_SERIES"), clientKey, cadence: z.enum(SERIES_CADENCES) }),
  z.object({ action: z.enum(["CANCEL", "NO_SHOW", "NOBODY_HOME"]), expectedVersion: z.number().int().nonnegative(), statement: z.string().max(4000).optional() }),
]);

async function loadBooking(tx: Prisma.TransactionClient, actor: Actor, requestId: string) {
  entityId.parse(requestId);
  const booking = await tx.booking.findUnique({ where: { requestId },
    include: { request: { include: { payment: true, selectedPro: { select: { userId: true } } } } } });
  const mine = booking && ((actor.role === "CLIENT" && booking.clientId === actor.id) ||
    (actor.role === "PRO" && actor.proProfile?.id === booking.profileId));
  invariant(booking && mine && booking.request.payment, "NOT_FOUND", 404, "Rezervimi nuk u gjet.");
  return booking as typeof booking & { request: { payment: NonNullable<typeof booking.request.payment> } };
}
const paidSoFar = (b: { dueCents: number; request: { payment: { state: string } } }) =>
  b.request.payment.state === "HELD" ? b.dueCents : 0;

export async function bookingAction(actor: Actor, requestId: string, input: unknown) {
  const data = bookingActionInput.parse(input);
  if (data.action === "PROPOSE_HOURS" || data.action === "PROPOSE_SERIES") await enforceLimit(`booking-change:${actor.id}`, 20, 60 * 60_000);
  return serializable(async (tx) => {
    const booking = await loadBooking(tx, actor, requestId);
    const request = booking.request;
    const other = actor.role === "PRO" ? request.clientId : request.selectedPro?.userId;
    const otherHref = `${actor.role === "PRO" ? "/llogaria" : "/pro"}/kerkesat/${request.id}`;
    const now = new Date();
    if (data.action === "PROPOSE_SERIES") return proposeSeriesFromBooking(tx, actor, booking, data.cadence, data.clientKey);
    if (data.action === "PROPOSE_HOURS") {
      invariant(actor.role === "PRO", "FORBIDDEN", 403, "Vetëm profesionisti propozon ndryshimin e orëve.");
      const key = hashToken(`booking-change:${actor.id}:${data.clientKey}`);
      const previous = await tx.bookingChange.findUnique({ where: { creationKey: key } });
      if (previous) return { ok: true, id: previous.id };
      invariant(booking.status === "CONFIRMED" && ["BOOKED", "IN_PROGRESS"].includes(request.state), "STATE", 409,
        "Orët mund të ndryshohen vetëm për një rezervim aktiv.");
      const hours = checkHours(data.minutes, MINUTE_STEP);
      invariant(hours.ok, "HOURS", 400, hours.ok ? "" : hours.message);
      invariant(data.minutes !== booking.minutes, "UNCHANGED", 400, "Zgjidhni një numër tjetër orësh nga ai i rezervuar.");
      if (data.note) noContact(data.note);
      await tx.bookingChange.updateMany({ where: { bookingId: booking.id, kind: "HOURS", state: "PROPOSED" }, data: { state: "SUPERSEDED", decidedAt: now } });
      const change = await tx.bookingChange.create({ data: {
        bookingId: booking.id, kind: "HOURS", state: "PROPOSED", actorId: actor.id, minutes: data.minutes,
        totalCents: bookingTotal(booking.hourlyRateCents, data.minutes), note: data.note || null, creationKey: key,
        meta: { fromMinutes: booking.minutes, fromTotalCents: booking.totalCents },
      } });
      if (other) await notify(tx, other, "BOOKING_HOURS", "Profesionisti propozoi ndryshim të orëve; konfirmoni në bisedë", otherHref);
      await tx.auditLog.create({ data: { actorId: actor.id, action: "BOOKING_HOURS_PROPOSED", target: request.id, meta: { changeId: change.id, minutes: data.minutes } } });
      return { ok: true, id: change.id, message: "Propozimi u dërgua. Totali i ri vlen pasi klienti ta konfirmojë." };
    }
    if (data.action === "CONFIRM_HOURS" || data.action === "DECLINE_HOURS") {
      invariant(actor.role === "CLIENT", "FORBIDDEN", 403, "Vetëm klienti e konfirmon ndryshimin e orëve.");
      const change = await tx.bookingChange.findFirst({ where: { id: data.changeId, bookingId: booking.id, kind: "HOURS" } });
      invariant(change, "NOT_FOUND", 404, "Propozimi nuk u gjet.");
      const target = data.action === "CONFIRM_HOURS" ? "CONFIRMED" : "DECLINED";
      if (change.state === target) return { ok: true };
      invariant(change.state === "PROPOSED" && booking.status === "CONFIRMED" && ["BOOKED", "IN_PROGRESS"].includes(request.state),
        "STALE", 409, "Propozimi nuk është më i hapur. Rifreskoni faqen.");
      if (target === "DECLINED") {
        await tx.bookingChange.update({ where: { id: change.id }, data: { state: "DECLINED", decidedAt: now } });
        if (other) await notify(tx, other, "BOOKING_HOURS", "Klienti nuk e pranoi ndryshimin e orëve; totali fillestar mbetet", otherHref);
        await tx.auditLog.create({ data: { actorId: actor.id, action: "BOOKING_HOURS_DECLINED", target: request.id, meta: { changeId: change.id } } });
        return { ok: true, message: "Ndryshimi u refuzua. Mbetet totali fillestar." };
      }
      const minutes = change.minutes!, totalCents = change.totalCents!;
      if (request.state === "BOOKED" && booking.startsAt > now)
        await assertAppointmentAvailable(tx, booking.profileId, booking.startsAt, `${minutes} min`, request.id);
      const price = priceJob(totalCents, booking.commissionBps, booking.creditCents);
      const todo = adjustmentTodo(paidSoFar(booking), price.dueCents);
      await tx.bookingChange.update({ where: { id: change.id }, data: { state: "CONFIRMED", decidedAt: now, ...(todo ?? {}) } });
      await tx.booking.update({ where: { id: booking.id }, data: { minutes, totalCents, commissionCents: price.commissionCents, proCents: price.proCents, dueCents: price.dueCents } });
      await tx.payment.update({ where: { id: request.payment.id }, data: { amount: totalCents, commissionAmount: price.commissionCents, proAmount: price.proCents } });
      if (request.acceptedQuoteId) await tx.quote.update({ where: { id: request.acceptedQuoteId }, data: { amount: totalCents, duration: `${minutes} min` } });
      await tx.serviceRequest.update({ where: { id: request.id }, data: { version: { increment: 1 } } });
      if (other) await notify(tx, other, "BOOKING_HOURS", "Klienti konfirmoi orët dhe totalin e ri", otherHref);
      await tx.auditLog.create({ data: { actorId: actor.id, action: "BOOKING_HOURS_CONFIRMED", target: request.id,
        meta: { changeId: change.id, minutes, totalCents, dueCents: price.dueCents, todo } } });
      return { ok: true, message: `U konfirmua: ${hoursLabel(minutes)} · ${money(totalCents)}.` };
    }
    // Cancellations and no-show reports.
    const cancel = data as Extract<typeof data, { expectedVersion: number }>;
    const reason = cancel.action as CancelReason;
    if (booking.status === "CANCELLED") return { ok: true };
    invariant(request.version === cancel.expectedVersion, "STALE", 409, "Rezervimi ka ndryshuar. Rifreskoni faqen.");
    invariant(request.state === "BOOKED", "STATE", 409, "Rezervimi nuk mund të anulohet pasi puna ka filluar. Raportoni problemin te puna.");
    if (reason === "CANCEL") invariant(booking.startsAt > now, "STARTED", 409, "Ora e fillimit ka kaluar. Raportoni mosparaqitjen nëse nuk u bë puna.");
    else invariant(booking.startsAt <= now, "TOO_EARLY", 409, "Mosparaqitja raportohet vetëm pas orës së fillimit.");
    const by = actor.role === "PRO" ? "PRO" : "CLIENT";
    invariant(reason === "CANCEL" || (reason === "NO_SHOW" && by === "CLIENT") || (reason === "NOBODY_HOME" && by === "PRO"),
      "FORBIDDEN", 403, "Nuk keni qasje në këtë veprim.");
    // Arrita gates (owner, 26 Nov 2026).
    const arrival = await tx.bookingArrival.findUnique({ where: { bookingId: booking.id } });
    if (reason === "NOBODY_HOME") {
      const gate = nobodyHomeGate(arrival, now);
      invariant(gate.ok, "ARRIVAL_GATE", 409, gate.ok ? "" : gate.message);
    }
    if (reason === "NO_SHOW") {
      const gate = noShowGate(booking.startsAt, arrival, now);
      invariant(gate !== "TOO_EARLY", "TOO_EARLY", 409, `Mosparaqitja raportohet ${NO_SHOW_AFTER_MINUTES} minuta pas orës së fillimit, nëse profesionisti nuk ka shënuar “Arrita”.`);
      if (gate === "DISPUTE") {
        const statement = cancel.statement?.trim() ?? "";
        invariant(statement.length >= 20, "STATEMENT", 400,
          `Profesionisti shënoi “Arrita” në ${clockTime(arrival!.checkedInAt)} te adresa. Shkruani çfarë ndodhi (së paku 20 shkronja) dhe ankesa shkon te administrata si kontest.`);
        noContact(statement);
        const job = await tx.serviceRequest.findUniqueOrThrow({ where: { id: request.id },
          include: { payment: { include: { dispute: true } }, selectedPro: { select: { userId: true } } } });
        invariant(job.payment?.state === "HELD", "STATE", 409,
          `Profesionisti shënoi “Arrita” në ${clockTime(arrival!.checkedInAt)}. Pagesa nuk është shënuar ende, ndaj kontaktoni ndihmën e Zgjoi.`);
        const opened = await createDispute(tx, actor, job, `Klienti raporton se profesionisti nuk erdhi (profesionisti shënoi “Arrita” në ${clockTime(arrival!.checkedInAt)}): ${statement}`);
        return { ok: true, id: opened.id, dispute: true, message: "Profesionisti kishte shënuar arritjen, ndaj raporti juaj u dërgua si kontest te administrata." };
      }
    }
    const outcome = await recordCancellation(tx, booking, { by, reason, actorId: actor.id, now, notifyUserId: other ?? null, notifyHref: otherHref });
    return { ok: true, message: outcome.label };
  });
}

type LoadedBooking = Awaited<ReturnType<typeof loadBooking>>;
/** Records a cancellation or no-show on a booking: fee split, refund/collect
 * to-do, history, estimate credit and the job state. */
export async function recordCancellation(tx: Prisma.TransactionClient, booking: Pick<LoadedBooking, "id" | "profileId" | "startsAt" | "dueCents" | "request">,
  o: { by: "CLIENT" | "PRO"; reason: CancelReason; actorId: string; now: Date; notifyUserId: string | null; notifyHref: string; note?: string }) {
  const { by, reason, now } = o;
  const request = booking.request;
  const paid = paidSoFar(booking);
  const outcome = cancellationOutcome({ by, reason, startsAt: booking.startsAt, now, paidCents: paid });
  const todo = outcome.refundCents > 0 ? { todoKind: "REFUND", todoCents: outcome.refundCents }
    : outcome.owedFeeCents > 0 ? { todoKind: "COLLECT", todoCents: outcome.owedFeeCents } : null;
  await tx.bookingChange.updateMany({ where: { bookingId: booking.id, kind: "HOURS", state: "PROPOSED" }, data: { state: "SUPERSEDED", decidedAt: now } });
  await tx.bookingChange.create({ data: { bookingId: booking.id, kind: "CANCELLATION", state: "RECORDED", actorId: o.actorId,
    note: outcome.label, ...(todo ?? {}), meta: { by, reason, paidCents: paid, ...outcome } } });
  await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelledAt: now, cancelledBy: by, cancelReason: reason,
    feeCents: outcome.feeCents, feeProCents: outcome.feeProCents, feePlatformCents: outcome.feePlatformCents, refundCents: outcome.refundCents } });
  if (request.payment.state === "PENDING") await tx.payment.update({ where: { id: request.payment.id }, data: { state: "EXPIRED" } });
  // A credited estimate returns to the customer for their next hire with this pro
  // (customer-fault cases follow RETURN_CREDIT_ON_CUSTOMER_FAULT).
  if (returnsEstimateCredit(outcome.rule)) {
    // The credit goes back to the customer: until it is used again, the paid
    // estimate is split 10 € pro / 5 € Zgjoi as a no-hire estimate.
    for (const e of await tx.estimate.findMany({ where: { creditedRequestId: request.id, state: "CREDITED" } }))
      await tx.estimate.updateMany({ where: { id: e.id, state: "CREDITED" },
        data: { state: "PAID", creditedRequestId: null, creditedAt: null, ...estimateSplit(e.amountCents) } });
  }
  const cancelledBy = reason === "NO_SHOW" ? "PRO_NO_SHOW" : reason === "NOBODY_HOME" ? "NOBODY_HOME" : by;
  await tx.serviceRequest.update({ where: { id: request.id }, data: { state: "CANCELLED", cancelledAt: now, cancelledBy, version: { increment: 1 } } });
  if (cancelledBy === "PRO" || cancelledBy === "PRO_NO_SHOW") await checkCancellationAlert(tx, booking.profileId, now);
  await tx.quote.updateMany({ where: { requestId: request.id, state: { in: ["SENT", "ACCEPTED"] } }, data: { state: "WITHDRAWN" } });
  if (o.notifyUserId) await notify(tx, o.notifyUserId, "BOOKING_CANCELLED", reason === "CANCEL" ? "Rezervimi u anulua" : "U raportua mosparaqitje; rezervimi u mbyll", o.notifyHref);
  await tx.auditLog.create({ data: { actorId: o.actorId, action: "BOOKING_CANCELLED", target: request.id, meta: { rule: outcome.rule, by, reason, todo, note: o.note } } });
  return outcome;
}

/* ------------------------------------------------------ admin to-dos */

export async function completeBookingTodo(actor: Actor, changeId: string, note: string) {
  invariant(actor.role === "ADMIN", "FORBIDDEN", 403, "Nuk keni qasje.");
  entityId.parse(changeId);
  const clean = note.trim().replace(/\s+/g, " ");
  invariant(clean.length >= 5 && clean.length <= 500, "NOTE", 400, "Shënoni si u krye (5–500 shkronja).");
  return serializable(async (tx) => {
    const change = await tx.bookingChange.findUnique({ where: { id: changeId } });
    invariant(change && change.todoKind, "NOT_FOUND", 404, "Detyra nuk u gjet.");
    if (change.todoDoneAt) return { ok: true, already: true };
    await tx.bookingChange.update({ where: { id: change.id }, data: { todoDoneAt: new Date(), todoDoneById: actor.id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "BOOKING_TODO_DONE", target: change.id,
      meta: { bookingId: change.bookingId, todoKind: change.todoKind, todoCents: change.todoCents, note: clean } } });
    return { ok: true, message: "Detyra u shënua si e kryer." };
  });
}
