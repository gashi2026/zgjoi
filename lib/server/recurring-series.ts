import "server-only";
import { proUserWhere, requireIdApproved } from "./id-verification";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { Actor } from "./auth";
import { AppError, invariant } from "./errors";
import { notify } from "./notifications";
import { serializable } from "./transaction";
import { hashToken } from "./tokens";
import { db } from "./db";
import { entityId } from "../marketplace-validation";
import { serviceCategory } from "../service-categories";
import { proOffers } from "./pro-categories";
import { checkHours } from "../book-now";
import {
  SERIES_CADENCES, type SeriesCadence, kosovoSlot, kosovoDay, seriesLabel, plannedOccurrences, occurrenceAt,
  occurrencesToRelease, GENERATION_HORIZON_DAYS, MIN_LEAD_MINUTES,
} from "../recurring-series";
import { bookingTermsFor, insertBookNow, recordCancellation } from "./bookings";

type SeriesRowInput = {
  clientId: string; profileId: string; categorySlug: string; cadence: SeriesCadence; firstStartsAt: Date;
  minutes: number; rateCents: number; detail: string; city: string; address: string | null;
  proposedBy: "CLIENT" | "PRO"; status: "ACTIVE" | "PROPOSED"; creationKey: string; now: Date; sourceRequestId?: string;
  /** MONTHLY only: the day of the month the customer asked for (1–31). */
  monthDay?: number;
};
export async function createSeriesRow(tx: Prisma.TransactionClient, s: SeriesRowInput) {
  const slot = kosovoSlot(s.firstStartsAt);
  return tx.recurringSeries.create({ data: {
    clientId: s.clientId, profileId: s.profileId, categorySlug: s.categorySlug, cadence: s.cadence,
    weekday: slot.weekday, startMinute: slot.startMinute,
    monthDay: s.cadence === "MONTHLY" ? (s.monthDay ?? kosovoDay(s.firstStartsAt)) : null, minutes: s.minutes, hourlyRateCents: s.rateCents,
    detail: s.detail, city: s.city, address: s.address, firstStartsAt: s.firstStartsAt, status: s.status,
    proposedBy: s.proposedBy, sourceRequestId: s.sourceRequestId ?? null, creationKey: s.creationKey,
    confirmedAt: s.status === "ACTIVE" ? s.now : null,
    // The first occurrence of a customer-created series is the Book now booking itself.
    generatedUntil: s.status === "ACTIVE" ? s.firstStartsAt : null,
  } });
}

const hrefFor = (role: "CLIENT" | "PRO") => (role === "PRO" ? "/pro/perseritjet" : "/llogaria/perseritjet");

/** Pro proposes a recurring schedule from one of their Book now bookings with
 * this customer. Nothing is booked until the customer confirms. */
export async function proposeSeriesFromBooking(tx: Prisma.TransactionClient, actor: Actor,
  booking: { id: string; profileId: string; clientId: string; startsAt: Date; minutes: number; seriesId: string | null; status: string;
    request: { id: string; categorySlug: string; detail: string | null; city: string; address: string | null; state: string } },
  cadence: SeriesCadence, clientKey: string) {
  invariant(actor.role === "PRO" && actor.proProfile?.id === booking.profileId, "FORBIDDEN", 403, "Vetëm profesionisti i këtij rezervimi e propozon përsëritjen.");
  await requireIdApproved(actor, tx);
  const creationKey = hashToken(`series-proposal:${actor.id}:${clientKey}`);
  const previous = await tx.recurringSeries.findUnique({ where: { creationKey } });
  if (previous) return { ok: true, id: previous.id };
  invariant(!booking.seriesId, "SERIES_EXISTS", 409, "Ky rezervim është tashmë pjesë e një rezervimi të përsëritur.");
  invariant(booking.status === "CONFIRMED" && booking.request.state !== "CANCELLED", "STATE", 409, "Përsëritja propozohet nga një rezervim aktiv ose i përfunduar.");
  const open = await tx.recurringSeries.findFirst({ where: { sourceRequestId: booking.request.id, status: { in: ["PROPOSED", "ACTIVE", "PAUSED"] } } });
  invariant(!open, "SERIES_EXISTS", 409, "Keni propozuar tashmë një përsëritje për këtë rezervim.");
  const profile = await tx.proProfile.findUniqueOrThrow({ where: { id: booking.profileId } });
  const terms = await bookingTermsFor(tx, profile, booking.request.categorySlug);
  invariant(terms, "BOOK_NOW_UNAVAILABLE", 409, "Aktivizoni “Rezervo tani” me tarifë për orë në profil para se të propozoni përsëritje.");
  const minutes = Math.max(booking.minutes, terms.minMinutes);
  const now = new Date();
  let first: Date | null = null;
  for (let k = 1; k < 200 && !first; k++) {
    const at = occurrenceAt(booking.startsAt, cadence, k, kosovoDay(booking.startsAt));
    if (at && at.getTime() > now.getTime() + 24 * 3_600_000) first = at;
  }
  invariant(first, "TIMING", 409, "Nuk u gjet një datë e ardhshme për këtë orar.");
  const series = await createSeriesRow(tx, { clientId: booking.clientId, profileId: booking.profileId, categorySlug: booking.request.categorySlug,
    cadence, firstStartsAt: first, minutes, rateCents: terms.rateCents, detail: booking.request.detail ?? "Rezervim i përsëritur",
    city: booking.request.city, address: booking.request.address, proposedBy: "PRO", status: "PROPOSED", creationKey, now, sourceRequestId: booking.request.id,
    monthDay: kosovoDay(booking.startsAt) });
  await notify(tx, booking.clientId, "RECURRING", "Profesionisti propozoi një rezervim të përsëritur; konfirmoni ose refuzoni", hrefFor("CLIENT"));
  await tx.auditLog.create({ data: { actorId: actor.id, action: "RECURRING_SERIES_PROPOSED", target: series.id,
    meta: { cadence, firstStartsAt: first.toISOString(), minutes, rateCents: terms.rateCents, sourceRequestId: booking.request.id } } });
  return { ok: true, id: series.id, message: `Propozimi u dërgua: ${seriesLabel(series)}. Rezervimet krijohen pasi klienti ta konfirmojë.` };
}

export const seriesActionInput = z.object({ action: z.enum(["CONFIRM", "DECLINE", "PAUSE", "RESUME", "CANCEL"]) });

/** Releases occurrences more than 24 h away (free cancellation, refund to-do if
 * paid). Occurrences within 24 h stay; either side cancels them under the normal rules. */
async function releaseUpcoming(tx: Prisma.TransactionClient, seriesId: string, by: "CLIENT" | "PRO", actorId: string, now: Date, note: string) {
  const bookings = await tx.booking.findMany({ where: { seriesId, status: "CONFIRMED", startsAt: { gt: now } },
    include: { request: { include: { payment: true, selectedPro: { select: { userId: true } } } } } });
  const release = occurrencesToRelease(bookings, now).filter(b => b.request.state === "BOOKED" && b.request.payment);
  for (const b of release) {
    const other = by === "PRO" ? b.request.clientId : b.request.selectedPro?.userId ?? null;
    await recordCancellation(tx, b as typeof b & { request: { payment: NonNullable<typeof b.request.payment> } },
      { by, reason: "CANCEL", actorId, now, notifyUserId: other, notifyHref: `${by === "PRO" ? "/llogaria" : "/pro"}/kerkesat/${b.request.id}`, note });
  }
  const kept = bookings.filter(b => !release.includes(b)).length;
  return { released: release.length, kept };
}

export async function seriesAction(actor: Actor, id: string, input: unknown) {
  entityId.parse(id);
  const { action } = seriesActionInput.parse(input);
  invariant(actor.role === "CLIENT" || actor.role === "PRO", "FORBIDDEN", 403, "Nuk keni qasje në këtë veprim.");
  // Starting or restarting a series needs a verified ID; pausing or cancelling never does.
  if (action === "CONFIRM" || action === "RESUME") await requireIdApproved(actor);
  const result = await serializable(async (tx) => {
    const series = await tx.recurringSeries.findUnique({ where: { id }, include: { profile: { select: { userId: true } } } });
    const mine = series && ((actor.role === "CLIENT" && series.clientId === actor.id) || (actor.role === "PRO" && actor.proProfile?.id === series.profileId));
    invariant(series && mine, "NOT_FOUND", 404, "Rezervimi i përsëritur nuk u gjet.");
    const by = actor.role === "PRO" ? "PRO" : "CLIENT";
    const other = by === "PRO" ? series.clientId : series.profile.userId;
    const otherHref = hrefFor(by === "PRO" ? "CLIENT" : "PRO");
    const now = new Date();
    const audit = (meta: Record<string, unknown> = {}) => tx.auditLog.create({ data: { actorId: actor.id, action: `RECURRING_SERIES_${action}`, target: series.id, meta: { by, ...meta } } });
    if (action === "CONFIRM" || action === "DECLINE") {
      invariant(by === "CLIENT", "FORBIDDEN", 403, "Vetëm klienti e konfirmon rezervimin e përsëritur.");
      const target = action === "CONFIRM" ? "ACTIVE" : "DECLINED";
      if (series.status === target) return { ok: true, generate: false };
      invariant(series.status === "PROPOSED", "STALE", 409, "Propozimi nuk është më i hapur. Rifreskoni faqen.");
      const changed = await tx.recurringSeries.updateMany({ where: { id, status: "PROPOSED" },
        data: target === "ACTIVE" ? { status: "ACTIVE", confirmedAt: now } : { status: "DECLINED", cancelledAt: now } });
      invariant(changed.count === 1, "STALE", 409, "Propozimi ka ndryshuar. Rifreskoni faqen.");
      await notify(tx, other, "RECURRING", target === "ACTIVE" ? "Klienti konfirmoi rezervimin e përsëritur" : "Klienti nuk e pranoi rezervimin e përsëritur", otherHref);
      await audit();
      return { ok: true, generate: target === "ACTIVE",
        message: target === "ACTIVE" ? `U konfirmua: ${seriesLabel(series)}. Vizitat e ardhshme krijohen si rezervime.` : "Propozimi u refuzua." };
    }
    if (action === "PAUSE" || action === "CANCEL") {
      const target = action === "PAUSE" ? "PAUSED" : "CANCELLED";
      if (series.status === target) return { ok: true, generate: false };
      const allowed = action === "PAUSE" ? ["ACTIVE"] : ["ACTIVE", "PAUSED", "PROPOSED"];
      invariant(allowed.includes(series.status), "STATE", 409, action === "PAUSE" ? "Vetëm një rezervim i përsëritur aktiv mund të pauzohet." : "Ky rezervim i përsëritur është mbyllur tashmë.");
      const changed = await tx.recurringSeries.updateMany({ where: { id, status: series.status },
        data: action === "PAUSE" ? { status: "PAUSED", pausedAt: now, pausedBy: by } : { status: "CANCELLED", cancelledAt: now, cancelledBy: by } });
      invariant(changed.count === 1, "STALE", 409, "Rezervimi i përsëritur ka ndryshuar. Rifreskoni faqen.");
      const note = action === "PAUSE" ? "Rezervimi i përsëritur u pauzua" : "Rezervimi i përsëritur u anulua";
      const { released, kept } = await releaseUpcoming(tx, id, by, actor.id, now, note);
      await notify(tx, other, "RECURRING", action === "PAUSE" ? "Rezervimi i përsëritur u vu në pauzë" : "Rezervimi i përsëritur u anulua", otherHref);
      await audit({ released, kept });
      const keptText = kept ? ` ${kept === 1 ? "Vizita" : `${kept} vizita`} brenda 24 orëve ${kept === 1 ? "mbetet" : "mbeten"}; anulimi i saj ndjek rregullat e zakonshme.` : "";
      return { ok: true, generate: false,
        message: `${action === "PAUSE" ? "U vu në pauzë" : "U anulua"}. ${released ? `${released} vizita të ardhshme u anuluan falas.` : "Nuk kishte vizita për t’u anuluar."}${keptText}` };
    }
    // RESUME
    if (series.status === "ACTIVE") return { ok: true, generate: false };
    invariant(series.status === "PAUSED", "STATE", 409, "Vetëm një rezervim i përsëritur në pauzë mund të rifillojë.");
    await tx.recurringSeries.update({ where: { id }, data: { status: "ACTIVE", pausedAt: null, pausedBy: null, statusNote: null, generatedUntil: now } });
    await notify(tx, other, "RECURRING", "Rezervimi i përsëritur rifilloi", otherHref);
    await audit();
    return { ok: true, generate: true, message: "Rifilloi. Vizitat e ardhshme krijohen përsëri si rezervime." };
  });
  if (result.generate) await generateForSeries(id).catch(() => undefined);
  const { generate: _generate, ...rest } = result;
  void _generate;
  return rest;
}

type GenerateResult = { created: number; skipped: number; paused: boolean };
/** Creates the bookings for one ACTIVE series within the 14-day horizon, and
 * always the next visit when none is booked a week or more ahead (monthly). Each
 * occurrence is its own transaction; a taken slot is skipped (both sides are
 * told), and a pro who can no longer be booked pauses the series. */
export async function generateForSeries(seriesId: string, now = new Date()): Promise<GenerateResult> {
  const out: GenerateResult = { created: 0, skipped: 0, paused: false };
  const series = await db.recurringSeries.findUnique({ where: { id: seriesId } });
  if (!series || series.status !== "ACTIVE") return out;
  const cadence = series.cadence as SeriesCadence;
  const latestLive = await db.booking.findFirst({ where: { seriesId, status: "CONFIRMED", startsAt: { gt: now } },
    orderBy: { startsAt: "desc" }, select: { startsAt: true } });
  for (const at of plannedOccurrences({ firstStartsAt: series.firstStartsAt, cadence, generatedUntil: series.generatedUntil, monthDay: series.monthDay }, now, latestLive?.startsAt ?? null)) {
    try {
      const step = await serializable(async (tx) => {
        const s = await tx.recurringSeries.findUnique({ where: { id: seriesId } });
        if (!s || s.status !== "ACTIVE" || (s.generatedUntil && s.generatedUntil >= at)) return "SKIP_DONE" as const;
        const profile = await tx.proProfile.findFirst({ where: { id: s.profileId, verification: "APPROVED", user: proUserWhere() } });
        const terms = profile && await proOffers(tx, profile.id, s.categorySlug)
          ? await bookingTermsFor(tx, profile, s.categorySlug) : null;
        const client = await tx.user.findFirst({ where: { id: s.clientId, suspendedAt: null, role: "CLIENT" } });
        if (!profile || !terms || !client) {
          await tx.recurringSeries.update({ where: { id: s.id }, data: { status: "PAUSED", pausedAt: now, pausedBy: "SYSTEM",
            statusNote: "Profesionisti nuk pranon më “Rezervo tani” ose llogaria nuk është aktive." } });
          await notify(tx, s.clientId, "RECURRING", "Rezervimi i përsëritur u vu në pauzë: profesionisti nuk pranon rezervime tani", hrefFor("CLIENT"));
          if (profile) await notify(tx, profile.userId, "RECURRING", "Rezervimi i përsëritur u vu në pauzë: aktivizoni “Rezervo tani” për ta rifilluar", hrefFor("PRO"));
          await tx.auditLog.create({ data: { action: "RECURRING_SERIES_AUTO_PAUSED", target: s.id, meta: { occurrenceAt: at.toISOString() } } });
          return "PAUSED" as const;
        }
        const live = await tx.booking.findFirst({ where: { seriesId: s.id, occurrenceAt: at, status: "CONFIRMED" } });
        if (!live) {
          invariant(checkHours(s.minutes, 30).ok, "HOURS", 409, "Orët e serisë nuk janë të vlefshme.");
          await insertBookNow(tx, { actorId: s.clientId, clientId: s.clientId, profile, categorySlug: s.categorySlug,
            rateCents: s.hourlyRateCents, minMinutes: terms.minMinutes, minutes: s.minutes, startsAt: at, detail: s.detail,
            city: s.city, address: s.address, now, creationKey: hashToken(`series-occurrence:${s.id}:${at.toISOString()}:${now.getTime()}`),
            series: { id: s.id, occurrenceAt: at, label: seriesLabel(s) } });
          await notify(tx, s.clientId, "BOOKED", "U krijua vizita e radhës e rezervimit tuaj të përsëritur; pagesa është në pritje", hrefFor("CLIENT"));
        }
        await tx.recurringSeries.update({ where: { id: s.id }, data: { generatedUntil: at } });
        return live ? ("SKIP_DONE" as const) : ("CREATED" as const);
      });
      if (step === "PAUSED") { out.paused = true; break; }
      if (step === "CREATED") out.created++;
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      // Slot taken, outside working hours, etc.: skip this date and tell both sides.
      out.skipped++;
      await serializable(async (tx) => {
        const s = await tx.recurringSeries.findUnique({ where: { id: seriesId }, include: { profile: { select: { userId: true } } } });
        if (!s || s.status !== "ACTIVE") return;
        await tx.recurringSeries.update({ where: { id: s.id }, data: { generatedUntil: at } });
        const title = `Vizita e përsëritur e ${at.toISOString().slice(0, 10)} nuk u krijua: ${error.message}`.slice(0, 190);
        await notify(tx, s.clientId, "RECURRING", title, hrefFor("CLIENT"));
        await notify(tx, s.profile.userId, "RECURRING", title, hrefFor("PRO"));
        await tx.auditLog.create({ data: { action: "RECURRING_OCCURRENCE_SKIPPED", target: s.id, meta: { occurrenceAt: at.toISOString(), code: error.code } } });
      });
    }
  }
  return out;
}

/** Cron: generate upcoming occurrences for every ACTIVE series whose cursor is
 * inside the horizon (a monthly series booked beyond it waits until it is). */
export async function generateRecurringBookings(now = new Date(), limit = 200) {
  const due = await db.recurringSeries.findMany({
    where: { status: "ACTIVE", OR: [{ generatedUntil: null }, { generatedUntil: { lt: new Date(now.getTime() + GENERATION_HORIZON_DAYS * 86_400_000 - MIN_LEAD_MINUTES * 60_000) } }] },
    orderBy: [{ generatedUntil: "asc" }, { id: "asc" }], take: limit, select: { id: true },
  });
  const total = { series: due.length, created: 0, skipped: 0, paused: 0, failed: 0 };
  for (const { id } of due) {
    try {
      const r = await generateForSeries(id, now);
      total.created += r.created; total.skipped += r.skipped; total.paused += r.paused ? 1 : 0;
    } catch {
      total.failed++;
      console.error(JSON.stringify({ event: "recurring_generation_failed", seriesId: id }));
    }
  }
  return total;
}

export { SERIES_CADENCES };
