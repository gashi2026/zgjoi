import test from "node:test";
import assert from "node:assert/strict";
import {
  occurrenceAt, upcomingOccurrences, kosovoSlot, seriesLabel, firstAfter, seriesCommissionBps, occurrencesToRelease,
  GENERATION_HORIZON_DAYS, cadenceLabels,
} from "../lib/recurring-series";
import { commissionRate } from "../lib/commission-policy";
import { priceJob, estimateCredit, cancellationOutcome, hiringFlow, ESTIMATE_PRICE_CENTS } from "../lib/book-now";

const monday9 = new Date("2026-10-19T07:00:00Z"); // Monday 09:00 Kosovo (CEST)

test("a series keeps the same Kosovo weekday and time, across daylight saving", () => {
  assert.deepEqual(kosovoSlot(monday9), { weekday: 0, startMinute: 540, date: "2026-10-19" });
  assert.equal(seriesLabel({ cadence: "WEEKLY", weekday: 0, startMinute: 540 }), "Çdo javë, e hënë në 09:00");
  assert.equal(seriesLabel({ cadence: "BIWEEKLY", weekday: 4, startMinute: 990 }), "Çdo dy javë, e premte në 16:30");
  // 25 Oct 2026 clocks go back: 09:00 is 07:00Z before and 08:00Z after.
  assert.equal(occurrenceAt(monday9, "WEEKLY", 1)!.toISOString(), "2026-10-26T08:00:00.000Z");
  assert.equal(occurrenceAt(monday9, "BIWEEKLY", 2)!.toISOString(), "2026-11-16T08:00:00.000Z");
  for (let k = 0; k < 30; k++) assert.equal(kosovoSlot(occurrenceAt(monday9, "WEEKLY", k)!).startMinute, 540);
  // 02:30 does not exist on 29 Mar 2026 (spring forward): that date is skipped, not moved.
  const sun0230 = new Date("2026-03-22T01:30:00Z");
  assert.equal(occurrenceAt(sun0230, "WEEKLY", 1), null);
  assert.equal(occurrenceAt(sun0230, "WEEKLY", 2)!.toISOString(), "2026-04-05T00:30:00.000Z");
  assert.deepEqual(Object.keys(cadenceLabels), ["WEEKLY", "BIWEEKLY"]);
});

test("only occurrences within the horizon and after the cursor are generated", () => {
  const now = new Date("2026-11-26T12:00:00Z");
  const weekly = upcomingOccurrences({ firstStartsAt: monday9, cadence: "WEEKLY", generatedUntil: null }, now);
  assert.deepEqual(weekly.map(d => d.toISOString()), ["2026-11-30T08:00:00.000Z", "2026-12-07T08:00:00.000Z"]);
  assert(weekly.every(d => d.getTime() <= now.getTime() + GENERATION_HORIZON_DAYS * 86_400_000));
  // Cursor already at 30 Nov: only 7 Dec is left; a second run is a no-op.
  const next = upcomingOccurrences({ firstStartsAt: monday9, cadence: "WEEKLY", generatedUntil: weekly[0] }, now);
  assert.deepEqual(next.map(d => d.toISOString()), ["2026-12-07T08:00:00.000Z"]);
  assert.deepEqual(upcomingOccurrences({ firstStartsAt: monday9, cadence: "WEEKLY", generatedUntil: weekly[1] }, now), []);
  // Biweekly skips alternate weeks.
  const biweekly = upcomingOccurrences({ firstStartsAt: monday9, cadence: "BIWEEKLY", generatedUntil: null }, now);
  assert.deepEqual(biweekly.map(d => d.toISOString()), ["2026-11-30T08:00:00.000Z"]);
  // Nothing before the first occurrence, nothing within the next hour.
  const future = new Date("2026-12-01T10:00:00Z");
  assert(upcomingOccurrences({ firstStartsAt: future, cadence: "WEEKLY", generatedUntil: null }, now).every(d => d >= future));
  assert.deepEqual(upcomingOccurrences({ firstStartsAt: new Date(now.getTime() + 30 * 60_000), cadence: "WEEKLY", generatedUntil: null }, now)
    .map(d => d.getTime() - now.getTime()), [7 * 86_400_000 + 30 * 60_000]);
  assert.equal(firstAfter(monday9, "BIWEEKLY")!.toISOString(), "2026-11-02T08:00:00.000Z");
});

test("recurring bookings pay 5% commission (vs 15%, or 10% elite) in every Book now category", () => {
  for (const slug of ["dado", "pastrim", "elektricist", "mjeshter-i-ujit"]) {
    assert.equal(seriesCommissionBps(slug), 500, slug);
    assert.equal(commissionRate(slug, { recurring: false, elite: false }).bps, 1500);
    assert.equal(commissionRate(slug, { recurring: false, elite: true }).bps, 1000);
    assert.equal(commissionRate(slug, { recurring: true, elite: true }).bps, 500, "recurring wins over elite");
  }
  assert.deepEqual(priceJob(4000, 500), { totalCents: 4000, commissionBps: 500, commissionCents: 200, proCents: 3800, creditCents: 0, dueCents: 4000, proExtraCents: 0 });
});

test("each occurrence follows the normal cancellation rules; pause/cancel releases only those > 24 h away", () => {
  const now = new Date("2026-11-26T12:00:00Z");
  const at = (h: number) => new Date(now.getTime() + h * 3_600_000);
  assert.equal(cancellationOutcome({ by: "CLIENT", reason: "CANCEL", startsAt: at(48), now, paidCents: 4000 }).rule, "FREE");
  const late = cancellationOutcome({ by: "CLIENT", reason: "CANCEL", startsAt: at(5), now, paidCents: 4000 });
  assert.deepEqual([late.rule, late.feeCents, late.feeProCents, late.feePlatformCents, late.refundCents], ["CLIENT_LATE", 1500, 1000, 500, 2500]);
  assert.equal(cancellationOutcome({ by: "PRO", reason: "CANCEL", startsAt: at(5), now, paidCents: 4000 }).refundCents, 4000);
  const bookings = [{ id: "a", startsAt: at(5), status: "CONFIRMED" }, { id: "b", startsAt: at(24), status: "CONFIRMED" },
    { id: "c", startsAt: at(170), status: "CONFIRMED" }, { id: "d", startsAt: at(200), status: "CANCELLED" }];
  assert.deepEqual(occurrencesToRelease(bookings, now).map(b => b.id), ["b", "c"]);
});

test("paid €15 estimate: Elektricist and Mjeshtër i Ujit only; credited once to the next hire, commission on the full price", () => {
  assert.equal(ESTIMATE_PRICE_CENTS, 1500);
  for (const slug of ["elektricist", "mjeshter-i-ujit", "hidraulik"]) assert.equal(hiringFlow(slug).estimatePriceCents, 1500, slug);
  for (const slug of ["dado", "pastrim", "grim"]) assert.equal(hiringFlow(slug).estimate, false, slug);
  const estimates = [
    { id: "e1", clientId: "c", profileId: "p", state: "PENDING", amountCents: 1500, creditedRequestId: null },
    { id: "e2", clientId: "c", profileId: "p", state: "CANCELLED", amountCents: 1500, creditedRequestId: null },
  ];
  assert.equal(estimateCredit(estimates, "c", "p").creditCents, 0, "an unpaid or cancelled estimate is never credited");
  const paid = [...estimates, { id: "e3", clientId: "c", profileId: "p", state: "PAID", amountCents: 1500, creditedRequestId: null }];
  assert.deepEqual(estimateCredit(paid, "c", "p"), { estimateId: "e3", creditCents: 1500 });
  assert.equal(estimateCredit(paid, "c", "other-pro").creditCents, 0, "only with the same pro");
  const job = priceJob(10000, 1500, 1500);
  assert.deepEqual([job.commissionCents, job.proCents, job.dueCents], [1500, 8500, 8500], "customer pays €100 − €15; commission on €100");
});
