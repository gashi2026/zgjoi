/** Hourly Book now: pure pricing, minimum-hours, cancellation and estimate
 * credit rules (owner decisions, 26 Nov 2026). No database or server imports,
 * so the same numbers are shown in the UI and enforced on the server. */
import { serviceCategory } from "./service-categories";

/* ----------------------------------------------------- hiring paths */

export type HiringFlow = { chat: true; bookNow: boolean; estimate: boolean; estimatePriceCents: number | null };
export const ESTIMATE_PRICE_CENTS = 1500;
/** Owner (26 Nov 2026): a paid estimate the customer does not turn into a hire
 * with that pro is split 10 € to the pro and 5 € to Zgjoi (like the late fee).
 * Credited to a hire, it becomes part of the job price instead (normal commission). */
export const ESTIMATE_PRO_SHARE_CENTS = 1000;
export const ESTIMATE_PLATFORM_SHARE_CENTS = 500;
export function estimateSplit(amountCents: number) {
  const platformShareCents = Math.min(ESTIMATE_PLATFORM_SHARE_CENTS, Math.max(0, amountCents));
  return { proShareCents: Math.max(0, amountCents) - platformShareCents, platformShareCents };
}
/** Code defaults. A Category row can override each value (null = default). */
const defaultFlows: Record<string, { bookNow: boolean; estimate: boolean }> = {
  elektricist: { bookNow: true, estimate: true },
  "mjeshter-i-ujit": { bookNow: true, estimate: true },
  dado: { bookNow: true, estimate: false },
  pastrim: { bookNow: true, estimate: false },
};
export type FlowOverride = { bookNowEnabled?: boolean | null; estimateEnabled?: boolean | null; estimatePriceCents?: number | null };
export function hiringFlow(slug: string, override: FlowOverride = {}): HiringFlow {
  const category = serviceCategory(slug);
  const base = (category && defaultFlows[category.slug]) || { bookNow: false, estimate: false };
  const estimate = override.estimateEnabled ?? base.estimate;
  return {
    chat: true,
    bookNow: override.bookNowEnabled ?? base.bookNow,
    estimate,
    estimatePriceCents: estimate ? (override.estimatePriceCents ?? ESTIMATE_PRICE_CENTS) : null,
  };
}

/* ------------------------------------------------- hours and pricing */

export const MINUTE_STEP = 30;
export const MAX_BOOKING_MINUTES = 12 * 60;
/** Suggested minimum when a pro first sets a Book now rate (2 h), as before. */
export const DEFAULT_MIN_MINUTES = 120;
export const MIN_RATE_CENTS = 100;
export const MAX_RATE_CENTS = 100_000;

/** Albanian label ("2,5 orë"); English pages translate it to "2.5 hr" via t.tx. */
export function hoursLabel(minutes: number) {
  const h = minutes / 60;
  const text = Number.isInteger(h) ? String(h) : h.toFixed(1).replace(".", ",");
  return `${text} orë`;
}

/** A minimum booking length a pro may set: 0.5..12 h in 30-minute steps. */
export function validMinMinutes(m: unknown): m is number {
  return typeof m === "number" && Number.isInteger(m) && m >= MINUTE_STEP && m <= MAX_BOOKING_MINUTES && m % MINUTE_STEP === 0;
}
/** The minimum for one profession: its own setting, else the pro's Book now default. */
export function bookingMinimum(professionMin: number | null | undefined, profileMin: number | null | undefined): number | null {
  return validMinMinutes(professionMin) ? professionMin : validMinMinutes(profileMin) ? profileMin : null;
}
/** Hour choices offered to the customer: from the pro's minimum up to 12 h. */
export function hourOptions(minMinutes: number) {
  const out: number[] = [];
  for (let m = Math.max(MINUTE_STEP, minMinutes); m <= MAX_BOOKING_MINUTES; m += MINUTE_STEP) out.push(m);
  return out;
}

export type HoursCheck = { ok: true } | { ok: false; code: "STEP" | "MINIMUM" | "MAXIMUM"; message: string };
export function checkHours(minutes: number, minMinutes: number): HoursCheck {
  if (!Number.isSafeInteger(minutes) || minutes <= 0 || minutes % MINUTE_STEP)
    return { ok: false, code: "STEP", message: "Zgjidhni orët me hapa gjysmë ore." };
  if (minutes < minMinutes)
    return { ok: false, code: "MINIMUM", message: `Ky profesionist pranon rezervime prej së paku ${hoursLabel(minMinutes)}.` };
  if (minutes > MAX_BOOKING_MINUTES)
    return { ok: false, code: "MAXIMUM", message: `Një rezervim mund të jetë deri në ${hoursLabel(MAX_BOOKING_MINUTES)}.` };
  return { ok: true };
}

/** rate × hours, rounded to the cent. */
export function bookingTotal(rateCents: number, minutes: number) {
  if (!Number.isSafeInteger(rateCents) || rateCents <= 0 || !Number.isSafeInteger(minutes) || minutes <= 0)
    throw new Error("Invalid booking terms");
  return Math.round((rateCents * minutes) / 60);
}

export type Price = {
  totalCents: number;      // full job price (rate × hours or the agreed quote)
  commissionBps: number;
  commissionCents: number; // Zgjoi's commission on the full price (estimate €5 counted inside)
  proCents: number;        // totalCents − commission (Payment row split)
  creditCents: number;     // paid estimate credited to this job
  dueCents: number;        // what the customer still pays: max(0, total − credit)
  proExtraCents: number;   // estimate excess on small jobs, kept by the pro
};
/** Commission is on the full price. A credited €15 estimate reduces what the
 * customer still pays; on jobs under €15 the customer pays nothing more and
 * the excess of the estimate goes to the pro. */
export function priceJob(totalCents: number, commissionBps: number, creditCents = 0): Price {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) throw new Error("Invalid total");
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 5000) throw new Error("Invalid commission");
  if (!Number.isSafeInteger(creditCents) || creditCents < 0) throw new Error("Invalid credit");
  const commissionCents = Math.round((totalCents * commissionBps) / 10000);
  return {
    totalCents, commissionBps, commissionCents,
    proCents: totalCents - commissionCents,
    creditCents,
    dueCents: Math.max(0, totalCents - creditCents),
    proExtraCents: Math.max(0, creditCents - totalCents),
  };
}

/* ------------------------------------------------------ estimate credit */

export type EstimateLike = { id: string; clientId: string; profileId: string; state: string; amountCents: number; creditedRequestId: string | null };
/** The full paid estimate with the same pro is credited once, on any path. */
export function estimateCredit(estimates: EstimateLike[], clientId: string, profileId: string) {
  const match = estimates
    .filter(e => e.clientId === clientId && e.profileId === profileId && e.state === "PAID" && !e.creditedRequestId)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  return match ? { estimateId: match.id, creditCents: match.amountCents } : { estimateId: null, creditCents: 0 };
}

/* ------------------------------------------------------- cancellations */

export const FREE_CANCEL_HOURS = 24;
export const LATE_FEE_CENTS = 1500;
export const LATE_FEE_PRO_CENTS = 1000;
export const LATE_FEE_PLATFORM_CENTS = 500;

export type CancelBy = "CLIENT" | "PRO";
export type CancelReason = "CANCEL" | "NO_SHOW" | "NOBODY_HOME";
export type CancelOutcome = {
  rule: "FREE" | "CLIENT_LATE" | "PRO_LATE" | "PRO_NO_SHOW" | "NOBODY_HOME";
  feeCents: number; feeProCents: number; feePlatformCents: number;
  refundCents: number;   // of what the customer already paid
  owedFeeCents: number;  // fee not covered by the payment (admin collects)
  proPaid: boolean;      // whether the pro keeps anything beyond the fee share
  label: string;
};
export function isLate(startsAt: Date, now: Date) {
  return startsAt.getTime() - now.getTime() < FREE_CANCEL_HOURS * 3_600_000;
}
/** paidCents is what the customer actually paid (0 while the beta payment is unmarked). */
export function cancellationOutcome(input: { by: CancelBy; reason: CancelReason; startsAt: Date; now: Date; paidCents: number }): CancelOutcome {
  const { by, reason, startsAt, now } = input;
  const paid = Math.max(0, input.paidCents);
  const none = { feeCents: 0, feeProCents: 0, feePlatformCents: 0, refundCents: paid, owedFeeCents: 0, proPaid: false };
  const fee = {
    feeCents: LATE_FEE_CENTS, feeProCents: LATE_FEE_PRO_CENTS, feePlatformCents: LATE_FEE_PLATFORM_CENTS,
    refundCents: Math.max(0, paid - LATE_FEE_CENTS), owedFeeCents: Math.max(0, LATE_FEE_CENTS - paid), proPaid: false,
  };
  if (reason === "NOBODY_HOME") {
    if (by !== "PRO") throw new Error("Only the pro reports nobody home");
    return { rule: "NOBODY_HOME", ...fee, label: "Askush nuk ishte në shtëpi: klienti humbet 15 € (10 € profesionisti, 5 € Zgjoi), pjesa tjetër rimbursohet." };
  }
  if (reason === "NO_SHOW") {
    if (by !== "CLIENT") throw new Error("Only the customer reports a pro no-show");
    return { rule: "PRO_NO_SHOW", ...none, label: "Profesionisti nuk erdhi: rimbursim i plotë për klientin, profesionisti nuk merr asgjë." };
  }
  if (!isLate(startsAt, now)) return { rule: "FREE", ...none, label: "Anulim falas (më shumë se 24 orë para fillimit): rimbursim i plotë." };
  if (by === "PRO") return { rule: "PRO_LATE", ...none, label: "Profesionisti anuloi brenda 24 orëve: rimbursim i plotë për klientin, profesionisti nuk merr asgjë." };
  return { rule: "CLIENT_LATE", ...fee, label: "Anulim brenda 24 orëve: tarifë fikse 15 € (10 € profesionisti, 5 € Zgjoi); pjesa tjetër rimbursohet." };
}

/** When a booking that used the €15 estimate credit is cancelled, the credit
 * goes back to the customer for their next hire with the same pro. This
 * switch covers the customer-fault cases (late customer cancel, nobody home).
 * Default true (current behaviour); set false to keep the credit used up. */
export const RETURN_CREDIT_ON_CUSTOMER_FAULT = true;
/** Whether a cancelled booking's estimate credit is returned to the customer. */
export function returnsEstimateCredit(rule: CancelOutcome["rule"], returnOnCustomerFault = RETURN_CREDIT_ON_CUSTOMER_FAULT) {
  const customerFault = rule === "CLIENT_LATE" || rule === "NOBODY_HOME";
  return customerFault ? returnOnCustomerFault : true;
}

/* ------------------------------------------------- hour-change proposals */

/** Owner decision (26 Nov 2026): a change takes effect only when the customer
 * explicitly confirms it; until then the original total stands. */
export const UNCONFIRMED_CHANGE_POLICY: "ORIGINAL_STANDS" | "ADMIN_DECIDES" = "ORIGINAL_STANDS";

export type HourChange = { id: string; state: string; minutes: number | null; totalCents: number | null; createdAt: string | Date };
/** The hours and total in force: the original booking plus the latest change
 * the customer confirmed. Proposed, declined or superseded changes never count. */
export function effectiveTerms(original: { minutes: number; totalCents: number }, changes: HourChange[]) {
  const confirmed = changes
    .filter(c => c.state === "CONFIRMED" && c.minutes && c.totalCents)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id))
    .at(-1);
  return confirmed ? { minutes: confirmed.minutes!, totalCents: confirmed.totalCents!, changeId: confirmed.id } : { ...original, changeId: null };
}

/** Admin to-do when confirmed totals change after the customer already paid. */
export function adjustmentTodo(paidCents: number, newDueCents: number): { todoKind: "REFUND" | "COLLECT"; todoCents: number } | null {
  if (paidCents <= 0) return null;
  const diff = newDueCents - paidCents;
  if (!diff) return null;
  return diff > 0 ? { todoKind: "COLLECT", todoCents: diff } : { todoKind: "REFUND", todoCents: -diff };
}
