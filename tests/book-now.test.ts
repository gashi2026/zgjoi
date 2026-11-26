import test from "node:test";
import assert from "node:assert/strict";
import {
  hiringFlow, checkHours, bookingTotal, priceJob, estimateCredit, cancellationOutcome, effectiveTerms,
  adjustmentTodo, hourOptions, UNCONFIRMED_CHANGE_POLICY, ESTIMATE_PRICE_CENTS, RETURN_CREDIT_ON_CUSTOMER_FAULT, returnsEstimateCredit,
} from "../lib/book-now";

test("hiring paths per category: Book now + estimate, Book now only, or chat only", () => {
  assert.deepEqual(hiringFlow("elektricist"), { chat: true, bookNow: true, estimate: true, estimatePriceCents: 1500 });
  assert.deepEqual(hiringFlow("hidraulik"), hiringFlow("mjeshter-i-ujit"), "legacy alias resolves");
  assert.equal(hiringFlow("mjeshter-i-ujit").estimate, true);
  for (const slug of ["dado", "nane", "pastrim"]) assert.deepEqual(hiringFlow(slug), { chat: true, bookNow: true, estimate: false, estimatePriceCents: null });
  for (const slug of ["grim", "frizer", "kurse", "valle", "korrier", "perkthyes", "moler", "kopshtar", "shtepiak", "ngrohje-klimatizim"])
    assert.deepEqual(hiringFlow(slug), { chat: true, bookNow: false, estimate: false, estimatePriceCents: null }, slug);
  assert.equal(hiringFlow("unknown").bookNow, false);
  // A Category row overrides the default; null keeps it.
  assert.equal(hiringFlow("grim", { bookNowEnabled: true }).bookNow, true);
  assert.equal(hiringFlow("elektricist", { bookNowEnabled: null, estimatePriceCents: 2000 }).estimatePriceCents, 2000);
  assert.equal(hiringFlow("elektricist", { estimateEnabled: false }).estimatePriceCents, null);
});

test("total is the pro's hourly rate × the hours the customer picks", () => {
  assert.equal(bookingTotal(1500, 120), 3000);
  assert.equal(bookingTotal(1500, 90), 2250);
  assert.equal(bookingTotal(1333, 30), 667, "rounded to the cent");
  assert.throws(() => bookingTotal(0, 60));
  assert.throws(() => bookingTotal(1500, -30));
});

test("the customer picks any hours at or above the pro's minimum, in half hours", () => {
  assert.deepEqual(checkHours(120, 120), { ok: true });
  assert.deepEqual(checkHours(300, 120), { ok: true });
  const below = checkHours(90, 120);
  assert(!below.ok && below.code === "MINIMUM");
  const odd = checkHours(100, 60);
  assert(!odd.ok && odd.code === "STEP");
  const long = checkHours(13 * 60, 60);
  assert(!long.ok && long.code === "MAXIMUM");
  assert.equal(hourOptions(120)[0], 120);
  assert.equal(hourOptions(120).at(-1), 720);
});

test("commission is on the full price; the €15 estimate is credited in full", () => {
  const standard = priceJob(10000, 1500);
  assert.deepEqual(standard, { totalCents: 10000, commissionBps: 1500, commissionCents: 1500, proCents: 8500, creditCents: 0, dueCents: 10000, proExtraCents: 0 });
  const credited = priceJob(10000, 1500, ESTIMATE_PRICE_CENTS);
  assert.equal(credited.dueCents, 8500, "customer pays €85 more after the €15 estimate");
  assert.equal(credited.commissionCents, 1500, "commission stays 15% of the full €100, the estimate's €5 counted inside");
  assert.equal(priceJob(10000, 1000, 1500).commissionCents, 1000, "elite 10%");
  assert.equal(priceJob(10000, 500).commissionCents, 500, "recurring 5%");
  const small = priceJob(1000, 1500, 1500);
  assert.equal(small.dueCents, 0, "under €15 the customer pays nothing more");
  assert.equal(small.proExtraCents, 500, "the excess of the estimate goes to the pro");
  assert.equal(small.commissionCents + small.proCents, small.totalCents);
});

test("estimate credit applies once, only to a paid estimate with the same pro", () => {
  const rows = [
    { id: "e1", clientId: "c", profileId: "p", state: "PAID", amountCents: 1500, creditedRequestId: null },
    { id: "e2", clientId: "c", profileId: "other", state: "PAID", amountCents: 1500, creditedRequestId: null },
    { id: "e3", clientId: "c", profileId: "p", state: "PENDING", amountCents: 1500, creditedRequestId: null },
  ];
  assert.deepEqual(estimateCredit(rows, "c", "p"), { estimateId: "e1", creditCents: 1500 });
  assert.deepEqual(estimateCredit(rows, "c", "nobody"), { estimateId: null, creditCents: 0 });
  assert.deepEqual(estimateCredit([{ ...rows[0], creditedRequestId: "req" }], "c", "p").creditCents, 0);
  assert.equal(estimateCredit(rows, "someone-else", "p").creditCents, 0);
});

test("cancellation outcomes follow the 24-hour rules", () => {
  const now = new Date("2030-01-10T10:00:00Z");
  const in48h = new Date("2030-01-12T10:00:00Z"), in2h = new Date("2030-01-10T12:00:00Z");
  const free = cancellationOutcome({ by: "CLIENT", reason: "CANCEL", startsAt: in48h, now, paidCents: 6000 });
  assert.equal(free.rule, "FREE"); assert.equal(free.refundCents, 6000); assert.equal(free.feeCents, 0);
  const late = cancellationOutcome({ by: "CLIENT", reason: "CANCEL", startsAt: in2h, now, paidCents: 6000 });
  assert.equal(late.rule, "CLIENT_LATE");
  assert.deepEqual([late.feeCents, late.feeProCents, late.feePlatformCents, late.refundCents], [1500, 1000, 500, 4500]);
  const lateUnpaid = cancellationOutcome({ by: "CLIENT", reason: "CANCEL", startsAt: in2h, now, paidCents: 0 });
  assert.equal(lateUnpaid.owedFeeCents, 1500); assert.equal(lateUnpaid.refundCents, 0);
  const proLate = cancellationOutcome({ by: "PRO", reason: "CANCEL", startsAt: in2h, now, paidCents: 6000 });
  assert.equal(proLate.rule, "PRO_LATE"); assert.equal(proLate.refundCents, 6000); assert.equal(proLate.feeProCents, 0);
  const noShow = cancellationOutcome({ by: "CLIENT", reason: "NO_SHOW", startsAt: now, now, paidCents: 6000 });
  assert.equal(noShow.rule, "PRO_NO_SHOW"); assert.equal(noShow.refundCents, 6000); assert.equal(noShow.proPaid, false);
  const nobody = cancellationOutcome({ by: "PRO", reason: "NOBODY_HOME", startsAt: now, now, paidCents: 6000 });
  assert.equal(nobody.rule, "NOBODY_HOME"); assert.equal(nobody.feeCents, 1500); assert.equal(nobody.refundCents, 4500);
  assert.throws(() => cancellationOutcome({ by: "CLIENT", reason: "NOBODY_HOME", startsAt: now, now, paidCents: 0 }));
  assert.throws(() => cancellationOutcome({ by: "PRO", reason: "NO_SHOW", startsAt: now, now, paidCents: 0 }));
  // Exactly 24 hours before is still free.
  assert.equal(cancellationOutcome({ by: "CLIENT", reason: "CANCEL", startsAt: new Date(now.getTime() + 24 * 3600000), now, paidCents: 1 }).rule, "FREE");
});

test("an hour change only counts once the customer confirms it; until then the original total stands", () => {
  assert.equal(UNCONFIRMED_CHANGE_POLICY, "ORIGINAL_STANDS");
  const original = { minutes: 120, totalCents: 3000 };
  const proposed = { id: "h1", state: "PROPOSED", minutes: 180, totalCents: 4500, createdAt: "2030-01-01T10:00:00Z" };
  assert.deepEqual(effectiveTerms(original, [proposed]), { ...original, changeId: null }, "unconfirmed proposal never changes the price");
  assert.deepEqual(effectiveTerms(original, [{ ...proposed, state: "DECLINED" }, { ...proposed, id: "h0", state: "SUPERSEDED" }]), { ...original, changeId: null });
  assert.deepEqual(effectiveTerms(original, [{ ...proposed, state: "CONFIRMED" }]), { minutes: 180, totalCents: 4500, changeId: "h1" });
  const later = { id: "h2", state: "CONFIRMED", minutes: 150, totalCents: 3750, createdAt: "2030-01-01T11:00:00Z" };
  assert.equal(effectiveTerms(original, [{ ...proposed, state: "CONFIRMED" }, later, { ...proposed, id: "h3", createdAt: "2030-01-01T12:00:00Z" }]).totalCents, 3750);
  // After payment, a confirmed change becomes an admin to-do for the difference.
  assert.deepEqual(adjustmentTodo(3000, 4500), { todoKind: "COLLECT", todoCents: 1500 });
  assert.deepEqual(adjustmentTodo(3000, 2250), { todoKind: "REFUND", todoCents: 750 });
  assert.equal(adjustmentTodo(0, 4500), null, "unpaid bookings just update the amount due");
  assert.equal(adjustmentTodo(3000, 3000), null);
});

test("cancelling a credited booking returns the estimate credit; customer-fault cases follow one switch", () => {
  assert.equal(RETURN_CREDIT_ON_CUSTOMER_FAULT, true);
  for (const rule of ["FREE", "PRO_LATE", "PRO_NO_SHOW"] as const) {
    assert.equal(returnsEstimateCredit(rule), true);
    assert.equal(returnsEstimateCredit(rule, false), true);
  }
  for (const rule of ["CLIENT_LATE", "NOBODY_HOME"] as const) {
    assert.equal(returnsEstimateCredit(rule), true);
    assert.equal(returnsEstimateCredit(rule, false), false);
  }
});
