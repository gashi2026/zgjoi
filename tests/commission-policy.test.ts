import test from "node:test";
import assert from "node:assert/strict";
import { serviceCategories, serviceCategory, categorySlugs, approvedHoneycomb } from "../lib/service-categories";
import { commissionMonth, eliteWinners, commissionRate } from "../lib/commission-policy";
import { nextRecurringDate, readRecurrence } from "../lib/recurring-bookings";
import { splitAmount } from "../lib/server/settings";

test("approved catalogue has exactly the 14 blueprint services, with safe legacy aliases", () => {
  assert.deepEqual(serviceCategories.map(c => c.name), ["Pastrim", "Dado", "Përkthim profesional", "Grim", "Frizer", "Kurse", "Valle", "Korrier", "Elektricist", "Mjeshtër i Ujit", "Ngrohje & Klimatizim", "Shtëpiak", "Moler", "Kopshtar"]);
  assert.equal(new Set(serviceCategories.map(c => c.slug)).size, 14);
  assert.equal(serviceCategory("hidraulik")?.slug, "mjeshter-i-ujit");
  assert(categorySlugs("frizer").includes("berber"));
  for (const slug of ["marketing", "kontabilist", "transport", "trainer-personal", "__proto__"])
    assert.equal(serviceCategory(slug), undefined);
  assert.deepEqual(approvedHoneycomb({ "1,1": "hidraulik", "1,2": "marketing" }), { "1,1": "mjeshter-i-ujit" });
});

test("each category applies 15/10/5 with recurring priority and exact cent conservation", () => {
  for (const category of serviceCategories) for (const [elite, recurring, expected] of [
    [false, false, 1500], [true, false, 1000], [false, true, 500], [true, true, 500],
  ] as const) {
    const rate = commissionRate(category.slug, { elite, recurring });
    assert.equal(rate.bps, expected);
    for (const amount of [1, 101, 6000, 9999, 10_000_000]) {
      const split = splitAmount(amount, rate.bps);
      assert.equal(split.commissionAmount + split.proAmount, amount);
      assert.equal(split.commissionAmount, Math.round(amount * expected / 10000));
    }
  }
  assert.deepEqual(splitAmount(6000, 1500), { commissionAmount: 900, proAmount: 5100 });
  assert.throws(() => commissionRate("transport", { elite: true, recurring: true }));
});

test("monthly cohorts use the whole completed Kosovo month, including year and DST boundaries", () => {
  const before = commissionMonth(new Date("2026-09-30T21:59:59.999Z"));
  const after = commissionMonth(new Date("2026-09-30T22:00:00Z"));
  assert.equal(before.month, "2026-09");
  assert.equal(after.month, "2026-10");
  assert.equal(after.from.toISOString(), "2026-08-31T22:00:00.000Z");
  assert.equal(after.until.toISOString(), "2026-09-30T22:00:00.000Z");
  const winter = commissionMonth(new Date("2026-11-01T00:00:00Z"));
  assert.equal(winter.from.toISOString(), "2026-09-30T22:00:00.000Z");
  assert.equal(winter.until.toISOString(), "2026-10-31T23:00:00.000Z");
  assert.equal(commissionMonth(new Date("2027-01-01T00:00:00Z")).sourceMonth, "2026-12");
});

test("elite ranking is per category, combines aliases, ignores zero volume and deterministically breaks ties", () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({ profileId: `p${String(i).padStart(2, "0")}`, categorySlug: "pastrim", grossCents: 4000 - i }));
  const winners = eliteWinners([...rows,
    { profileId: "plumber", categorySlug: "hidraulik", grossCents: 700 },
    { profileId: "plumber", categorySlug: "mjeshter-i-ujit", grossCents: 500 },
    { profileId: "z", categorySlug: "mjeshter-i-ujit", grossCents: 1200 },
    { profileId: "zero", categorySlug: "dado", grossCents: 0 },
    { profileId: "removed", categorySlug: "transport", grossCents: 999999 },
  ]);
  assert.deepEqual(winners.map(w => w.profileId), ["p00", "p01", "plumber"]);
  assert.equal(winners[2].grossCents, 1200);
  assert.deepEqual(eliteWinners([]), []);
  assert.throws(() => eliteWinners([{ profileId: "overflow", categorySlug: "pastrim", grossCents: Number.MAX_SAFE_INTEGER + 1 }]));
});

test("recurring visit dates follow Kosovo wall time, clamp month ends, and reject ambiguous DST hours", () => {
  assert.equal(nextRecurringDate(new Date("2026-03-23T08:00:00Z"), "WEEKLY").toISOString(), "2026-03-30T07:00:00.000Z");
  assert.equal(nextRecurringDate(new Date("2026-01-31T08:00:00Z"), "MONTHLY").toISOString(), "2026-02-28T08:00:00.000Z");
  assert.equal(nextRecurringDate(new Date("2026-09-01T07:00:00Z"), "FORTNIGHTLY").toISOString(), "2026-09-15T07:00:00.000Z");
  assert.throws(() => nextRecurringDate(new Date("2026-10-18T00:30:00Z"), "WEEKLY"));
  assert.equal(readRecurrence({ recurring: true, commissionBps: 500 }), null);
});
