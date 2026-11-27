import { serviceCategory } from "./service-categories";

/** Most professions one pro can offer at once (sign-up and profile panel). */
export const MAX_PRO_CATEGORIES = 5;

export type ProCategoryRow = { categorySlug: string; priceFromCents: number | null; position: number; approvedAt: Date | null };

/** Canonical, de-duplicated, catalogue-only list of slugs in the order chosen. Unknown slugs
 * (e.g. the legacy "trainer-personal") are dropped. */
export function normalizeCategorySlugs(slugs: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of slugs) {
    const slug = serviceCategory(String(raw).trim())?.slug;
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}

/** Rows a customer may see and hire for: approved, in the catalogue, primary first. */
export function publicCategories<T extends ProCategoryRow>(rows: readonly T[], active?: readonly string[]): T[] {
  return [...rows]
    .filter((r) => r.approvedAt && serviceCategory(r.categorySlug) && (!active || active.includes(serviceCategory(r.categorySlug)!.slug)))
    .sort((a, b) => a.position - b.position);
}

/** The lowest "price from" over the given rows; null when no profession has a price. */
export function lowestPrice(rows: readonly Pick<ProCategoryRow, "priceFromCents">[]): number | null {
  const prices = rows.map((r) => r.priceFromCents).filter((p): p is number => typeof p === "number" && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** Which profession a contact/booking is for: the one asked for when the pro offers it,
 * otherwise the pro's first public profession. Null when the pro has none. */
export function pickCategory(rows: readonly ProCategoryRow[], requested?: string | null, active?: readonly string[]): string | null {
  const offered = publicCategories(rows, active).map((r) => serviceCategory(r.categorySlug)!.slug);
  const wanted = requested ? serviceCategory(requested)?.slug : undefined;
  if (wanted && offered.includes(wanted)) return wanted;
  return offered[0] ?? null;
}

/** True when the pro currently offers (approved) this category. Aliases count as the same category. */
export function offersCategory(rows: readonly ProCategoryRow[], slug: string): boolean {
  const wanted = serviceCategory(slug)?.slug;
  return !!wanted && publicCategories(rows).some((r) => serviceCategory(r.categorySlug)!.slug === wanted);
}
