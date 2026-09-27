import { serviceCategories, serviceCategory } from "./service-categories";
import { KOSOVO_TIME_ZONE, kosovoLocalToIso } from "./scheduling";

export const COMMISSION_POLICY_VERSION = "2026-09-27-v1";
export const categoryCommissionRates = Object.fromEntries(serviceCategories.map(c =>
  [c.slug, { standard: 1500, elite: 1000, recurring: 500 }])) as Record<string,
  { standard: number; elite: number; recurring: number }>;

export function commissionMonth(now: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: KOSOVO_TIME_ZONE, year: "numeric", month: "2-digit",
  }).formatToParts(now).map(p => [p.type, p.value]));
  const month = `${parts.year}-${parts.month}`;
  const previous = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 2, 1));
  const sourceMonth = previous.toISOString().slice(0, 7);
  return { month, sourceMonth,
    from: new Date(kosovoLocalToIso(`${sourceMonth}-01T00:00`)),
    until: new Date(kosovoLocalToIso(`${month}-01T00:00`)) };
}

export type CategoryEarnings = { profileId: string; categorySlug: string; grossCents: number };
/** Positive-volume earners only; ceiling for small cohorts, stable ID tie-break.
 * Combine aliases before ranking, so a renamed category never counts twice. */
export function eliteWinners(earnings: CategoryEarnings[]) {
  const totals = new Map<string, CategoryEarnings>();
  for (const row of earnings) {
    const category = serviceCategory(row.categorySlug);
    if (!category) continue;
    if (!Number.isSafeInteger(row.grossCents)) throw new Error("Invalid commission volume");
    if (row.grossCents <= 0) continue;
    const key = `${category.slug}:${row.profileId}`, previous = totals.get(key);
    const grossCents = row.grossCents + (previous?.grossCents ?? 0);
    if (!Number.isSafeInteger(grossCents)) throw new Error("Invalid commission volume");
    totals.set(key, { ...row, categorySlug: category.slug, grossCents });
  }
  return serviceCategories.flatMap(category => {
    const ranked = [...totals.values()].filter(r => r.categorySlug === category.slug)
      .sort((a, b) => b.grossCents - a.grossCents || (a.profileId < b.profileId ? -1 : a.profileId > b.profileId ? 1 : 0));
    return ranked.slice(0, Math.ceil(ranked.length * 0.05));
  });
}

export function commissionRate(slug: string, eligibility: { elite: boolean; recurring: boolean }) {
  const category = serviceCategory(slug);
  if (!category) throw new Error("Unsupported service category");
  const rates = categoryCommissionRates[category.slug];
  const tier = eligibility.recurring ? "recurring" : eligibility.elite ? "elite" : "standard";
  return { categorySlug: category.slug, tier, bps: rates[tier], policyVersion: COMMISSION_POLICY_VERSION };
}
