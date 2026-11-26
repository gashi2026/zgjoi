import test from "node:test";
import assert from "node:assert/strict";
import { canOpenDispute, readyForDecision, responseDeadline, settleDispute, DISPUTE_OPEN_DAYS, DISPUTE_RESPONSE_HOURS } from "../lib/dispute-rules";
import { classifyJob, summarizeTrust, shouldAlert, donutSegments, LATE_AFTER_MINUTES, CANCELLATION_WINDOW_DAYS, CANCELLATION_ALERT_THRESHOLD, TRUST_PUBLIC } from "../lib/trust";

const now = new Date("2030-03-10T12:00:00Z");
const days = (n: number) => new Date(now.getTime() - n * 86400000);

test("dispute defaults: 3 days to open after the job, 48 hours to respond", () => {
  assert.equal(DISPUTE_OPEN_DAYS, 3);
  assert.equal(DISPUTE_RESPONSE_HOURS, 48);
  assert(canOpenDispute({ state: "IN_PROGRESS", completedAt: null, cancelledAt: null }, now));
  assert(canOpenDispute({ state: "COMPLETED", completedAt: days(2.9), cancelledAt: null }, now));
  assert(!canOpenDispute({ state: "COMPLETED", completedAt: days(3.1), cancelledAt: null }, now));
  assert(canOpenDispute({ state: "CANCELLED", completedAt: null, cancelledAt: days(1) }, now));
  assert(!canOpenDispute({ state: "OPEN", completedAt: null, cancelledAt: null }, now));
  assert.equal(responseDeadline(now).getTime() - now.getTime(), 48 * 3600000);
  assert(!readyForDecision({ respondedAt: null, respondBy: new Date(now.getTime() + 1000) }, now));
  assert(readyForDecision({ respondedAt: now, respondBy: new Date(now.getTime() + 1000) }, now));
  assert(readyForDecision({ respondedAt: null, respondBy: now }, now));
});

test("admin decisions: final price recalculates commission and the pro's share", () => {
  const base = { amountCents: 10000, commissionBps: 1500, estimateCreditCents: 0, paidCents: 10000 };
  const partial = settleDispute({ ...base, outcome: "PARTIAL_REFUND", finalPriceCents: 6000 });
  assert.deepEqual([partial.finalPriceCents, partial.commissionCents, partial.proCents, partial.refundCents], [6000, 900, 5100, 4000]);
  assert.deepEqual(partial.todo, { kind: "REFUND", cents: 4000 });
  assert.throws(() => settleDispute({ ...base, outcome: "PARTIAL_REFUND", finalPriceCents: 10000 }));
  assert.throws(() => settleDispute({ ...base, outcome: "PARTIAL_REFUND" }));
  const full = settleDispute({ ...base, outcome: "FULL_REFUND" });
  assert.equal(full.endsJob, true); assert.equal(full.refundCents, 10000); assert.equal(full.proCents, 0);
  const credit = settleDispute({ ...base, outcome: "CREDIT", customerCreditCents: 1500 });
  assert.deepEqual(credit.todo, { kind: "CREDIT", cents: 1500 }); assert.equal(credit.proCents, 8500);
  assert.throws(() => settleDispute({ ...base, outcome: "CREDIT" }));
  const none = settleDispute({ ...base, outcome: "NO_ACTION" });
  assert.equal(none.todo, null); assert.equal(none.finalPriceCents, 10000);
  // No action with a new price on an unpaid job: no refund to-do.
  assert.equal(settleDispute({ ...base, paidCents: 0, outcome: "NO_ACTION", finalPriceCents: 8000 }).commissionCents, 1200);
  // The estimate credit still reduces what the customer pays.
  assert.equal(settleDispute({ ...base, estimateCreditCents: 1500, paidCents: 8500, outcome: "PARTIAL_REFUND", finalPriceCents: 5000 }).refundCents, 5000);
});

test("trust history: on time, late (> 15 min), not finished, disputes and 90-day cancellations", () => {
  assert.equal(LATE_AFTER_MINUTES, 15); assert.equal(CANCELLATION_WINDOW_DAYS, 90); assert.equal(CANCELLATION_ALERT_THRESHOLD, 3); assert.equal(TRUST_PUBLIC, true);
  const at = new Date("2030-03-01T09:00:00Z");
  const job = (extra: Partial<Parameters<typeof classifyJob>[0]>) => ({ state: "COMPLETED", scheduledAt: at, startedAt: at, cancelledAt: null, cancelledBy: null, hasDispute: false, ...extra });
  assert.equal(classifyJob(job({ startedAt: new Date(at.getTime() + 15 * 60000) })), "ON_TIME", "exactly 15 minutes is on time");
  assert.equal(classifyJob(job({ startedAt: new Date(at.getTime() + 16 * 60000) })), "LATE");
  assert.equal(classifyJob(job({ scheduledAt: null, startedAt: null })), "ON_TIME");
  assert.equal(classifyJob(job({ state: "CANCELLED", cancelledBy: "PRO" })), "NOT_FINISHED");
  assert.equal(classifyJob(job({ state: "CANCELLED", cancelledBy: "PRO_NO_SHOW" })), "NOT_FINISHED");
  assert.equal(classifyJob(job({ state: "CANCELLED", cancelledBy: "DISPUTE_REFUND" })), "NOT_FINISHED");
  assert.equal(classifyJob(job({ state: "CANCELLED", cancelledBy: "CLIENT" })), null, "customer cancellations are not the pro's record");
  assert.equal(classifyJob(job({ state: "BOOKED" })), null);
  const summary = summarizeTrust([
    job({}), job({ startedAt: new Date(at.getTime() + 40 * 60000), hasDispute: true }),
    job({ state: "CANCELLED", cancelledBy: "PRO", cancelledAt: days(10) }),
    job({ state: "CANCELLED", cancelledBy: "PRO", cancelledAt: days(120) }),
    job({ state: "CANCELLED", cancelledBy: "CLIENT", cancelledAt: days(1) }),
    job({ state: "BOOKED" }),
  ], now);
  assert.deepEqual(summary, { booked: 6, onTime: 1, late: 1, notFinished: 2, disputes: 1, cancellations: 1 });
  assert(!shouldAlert(2)); assert(shouldAlert(3));
});

test("donut segments use green, gold and red with percentages", () => {
  const { total, rows } = donutSegments({ onTime: 42, late: 5, notFinished: 1 });
  assert.equal(total, 48);
  assert.deepEqual(rows.map(r => [r.label, r.color, r.pct]), [["Në kohë", "#2F9B5F", 88], ["Me vonesë", "#FFB800", 10], ["Pa përfunduar", "#D9534F", 2]]);
  assert.equal(donutSegments({ onTime: 0, late: 0, notFinished: 0 }).rows[0].pct, 0);
});
