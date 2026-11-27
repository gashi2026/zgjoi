import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import type { Actor } from "./auth";
import { invariant } from "./errors";
import { serializable } from "./transaction";
import { notify } from "./notifications";
import { activeServiceCategories, requireActiveCategory } from "./service-catalog";
import { categorySlugs, serviceCategory } from "../service-categories";
import { cleanText, euroAmount } from "../marketplace-validation";
import { validMinMinutes, MIN_RATE_CENTS, MAX_RATE_CENTS } from "../book-now";
import { MAX_PRO_CATEGORIES, lowestPrice, normalizeCategorySlugs, offersCategory, pickCategory, publicCategories } from "../pro-categories";

type Tx = Prisma.TransactionClient;
type CatalogTx = Pick<Tx, "category" | "proCategory">;

export const proCategorySelect = { categorySlug: true, priceFromCents: true, minMinutes: true, hourlyRateCents: true, position: true, approvedAt: true } satisfies Prisma.ProCategorySelect;
/** Public (approved) professions, primary first. Use inside a ProProfile select. */
export const publicCategoriesSelect = { where: { approvedAt: { not: null } }, orderBy: { position: "asc" }, select: proCategorySelect } satisfies Prisma.ProProfile$categoriesArgs;

/** Where-clause: the pro offers (approved) one of these categories. Pass canonical slugs. */
export function offersAnyWhere(slugs: readonly string[]): Prisma.ProProfileWhereInput {
  return { categories: { some: { categorySlug: { in: slugs.flatMap((s) => categorySlugs(s)) }, approvedAt: { not: null } } } };
}

/** The category a new chat / Book now / estimate is for: `requested` when this pro offers it
 * (approved, active), else their first public profession. Refuses when they offer none. */
export async function resolveProCategory(tx: CatalogTx, profileId: string, requested?: string | null) {
  const [rows, active] = await Promise.all([
    tx.proCategory.findMany({ where: { profileId }, select: proCategorySelect }),
    activeServiceCategories(tx),
  ]);
  const slug = pickCategory(rows, requested, active.map((c) => c.slug));
  invariant(slug, "CATEGORY", 409, "Ky profesionist nuk ofron shërbime aktive për momentin.");
  return requireActiveCategory(slug, tx);
}

/** True when the pro still offers this category (approved). Used by recurring visits and elite checks. */
export async function proOffers(tx: Pick<Tx, "proCategory">, profileId: string, slug: string) {
  return offersCategory(await tx.proCategory.findMany({ where: { profileId }, select: proCategorySelect }), slug);
}

/** Keeps ProProfile.categorySlug (primary = first row) and ProProfile.priceFrom (lowest price) in sync. */
export async function syncProfileSummary(tx: Pick<Tx, "proCategory" | "proProfile">, profileId: string) {
  const rows = await tx.proCategory.findMany({ where: { profileId }, orderBy: { position: "asc" }, select: proCategorySelect });
  const primary = rows[0]?.categorySlug;
  await tx.proProfile.update({ where: { id: profileId }, data: { ...(primary ? { categorySlug: primary } : {}), priceFrom: lowestPrice(rows) } });
}

/** Creates the rows for a new pro (sign-up / admin-created): no prices, waiting for approval. */
export async function createProCategories(tx: Tx, profileId: string, slugs: readonly string[]) {
  for (const [position, categorySlug] of slugs.entries())
    await tx.proCategory.create({ data: { profileId, categorySlug, position } });
}

/** Sign-up and profile input: 1..MAX categories, each an active catalogue category. */
export async function requireActiveCategories(raw: readonly string[], tx: CatalogTx) {
  const slugs = normalizeCategorySlugs(raw);
  invariant(slugs.length >= 1, "CATEGORY", 400, "Zgjidhni të paktën një profesion.");
  invariant(slugs.length <= MAX_PRO_CATEGORIES, "CATEGORY", 400, `Mund të zgjidhni deri në ${MAX_PRO_CATEGORIES} profesione.`);
  for (const slug of slugs) await requireActiveCategory(slug, tx);
  return slugs;
}

const optionalPrice = z.preprocess((v) => (v === "" || v === null ? undefined : v), euroAmount.optional());
const optionalMinMinutes = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().refine(validMinMinutes, "Minimumi i orëve duhet të jetë nga 0,5 deri në 12 orë, me hapa gjysmë ore.").optional());
const optionalRate = z.preprocess((v) => (v === "" || v === null ? undefined : v),
  euroAmount.refine((c) => c >= MIN_RATE_CENTS && c <= MAX_RATE_CENTS, "Tarifa për orë duhet të jetë nga 1 € deri në 1.000 €.").optional());
export const professionsInput = z.object({
  categories: z.array(z.object({ slug: cleanText(1, 80), priceFrom: optionalPrice, minMinutes: optionalMinMinutes, hourlyRate: optionalRate })).min(1, "Zgjidhni të paktën një profesion.").max(MAX_PRO_CATEGORIES),
});

/** Profile panel, any time (pending or approved): the pro's professions (order = order shown; first = main),
 * their optional "from" price, hourly rate and minimum hours.
 * Keeping a profession keeps its approval; a new one waits for the owner, while the pro stays
 * visible in the professions already approved. Prices, rates and minimum hours never need approval. */
export async function saveProfessions(actor: Actor, input: unknown) {
  invariant(actor.role === "PRO" && actor.proProfile, "FORBIDDEN", 403, "Nuk keni qasje në këtë veprim.");
  const data = professionsInput.parse(input);
  const profileId = actor.proProfile.id;
  return serializable(async (tx) => {
    const slugs = await requireActiveCategories(data.categories.map((c) => c.slug), tx);
    const price = new Map<string, number | null>(data.categories.map((c) => [serviceCategory(c.slug)?.slug ?? c.slug, c.priceFrom ?? null]));
    const minimum = new Map<string, number | null>(data.categories.map((c) => [serviceCategory(c.slug)?.slug ?? c.slug, c.minMinutes ?? null]));
    const rate = new Map<string, number | null>(data.categories.map((c) => [serviceCategory(c.slug)?.slug ?? c.slug, c.hourlyRate ?? null]));
    const before = await tx.proCategory.findMany({ where: { profileId } });
    const profile = await tx.proProfile.findUniqueOrThrow({ where: { id: profileId }, select: { verification: true, hourlyRateCents: true, bookNowEnabled: true } });
    const removed = before.filter((r) => !slugs.includes(serviceCategory(r.categorySlug)?.slug ?? ""));
    if (removed.length) await tx.proCategory.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
    const added: string[] = [];
    for (const [position, slug] of slugs.entries()) {
      const existing = before.find((r) => serviceCategory(r.categorySlug)?.slug === slug);
      const priceFromCents = price.get(slug) ?? null;
      const minMinutes = minimum.get(slug) ?? null;
      const hourlyRateCents = rate.get(slug) ?? null;
      if (existing) await tx.proCategory.update({ where: { id: existing.id }, data: { position, priceFromCents, minMinutes, hourlyRateCents, categorySlug: slug } });
      else {
        added.push(slug);
        await tx.proCategory.create({ data: { profileId, categorySlug: slug, position, priceFromCents, minMinutes, hourlyRateCents } });
      }
    }
    await syncProfileSummary(tx, profileId);
    // Rates now live on each profession (the panel pre-fills the old single rate): retire the legacy
    // fallback, keeping the Book now switch exactly as it was.
    if (profile.hourlyRateCents !== null || profile.bookNowEnabled === null)
      await tx.proProfile.update({ where: { id: profileId }, data: { hourlyRateCents: null, bookNowEnabled: profile.bookNowEnabled ?? profile.hourlyRateCents !== null } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PRO_CATEGORIES_UPDATED", target: profileId,
      meta: { categories: slugs, added, removed: removed.map((r) => r.categorySlug), priced: slugs.filter((s) => price.get(s)),
        minimums: Object.fromEntries(slugs.map((s) => [s, minimum.get(s) ?? null])),
        rates: Object.fromEntries(slugs.map((s) => [s, rate.get(s) ?? null])), legacyRate: profile.hourlyRateCents } } });
    // An approved pro adding a profession: the owner approves it before it shows publicly.
    if (added.length && profile.verification === "APPROVED") {
      const admins = await tx.user.findMany({ where: { role: "ADMIN", suspendedAt: null }, select: { id: true } });
      for (const admin of admins)
        await notify(tx, admin.id, "PRO_CATEGORY_PENDING", "Një profesionist shtoi një profesion që pret miratimin", "/admin/perdoruesit");
    }
    return { ok: true, message: added.length && profile.verification === "APPROVED"
      ? "Ndryshimet u ruajtën. Profesioni i ri shfaqet sapo të miratohet."
      : "Ndryshimet u ruajtën." };
  });
}

/** Rows for the profile panel and admin (all, including pending), primary first. */
export function proCategoriesFor(profileId: string, tx: Pick<Tx, "proCategory"> = db) {
  return tx.proCategory.findMany({ where: { profileId }, orderBy: { position: "asc" }, select: proCategorySelect });
}

export { publicCategories };
