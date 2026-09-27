import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { invariant } from "./errors";
import { allowedCategorySlugs, serviceCategories, serviceCategory, categorySlugs } from "../service-categories";

type CatalogDB = Pick<Prisma.TransactionClient, "category">;

/** Code defines the allowed catalogue. Saved records can disable a category;
 * absence of a legacy seed row does not prevent a newly approved category. */
export async function activeServiceCategories(tx: CatalogDB = db) {
  const rows = await tx.category.findMany({ where: { slug: { in: allowedCategorySlugs } } });
  return serviceCategories.flatMap(category => {
    const saved = rows.find(r => r.slug === category.slug);
    const legacy = rows.filter(r => (category.aliases as readonly string[]).includes(r.slug));
    const active = saved ? saved.active : !legacy.length || legacy.some(r => r.active);
    return active ? [{ id: saved?.id ?? legacy[0]?.id ?? category.slug,
      slug: category.slug, name: category.name, icon: category.icon }] : [];
  });
}

export async function requireActiveCategory(slug: string, tx: CatalogDB = db) {
  const category = serviceCategory(slug);
  invariant(category, "CATEGORY", 400, "Zgjidhni një nga kategoritë e Zgjoi.");
  const rows = await tx.category.findMany({ where: { slug: { in: categorySlugs(slug) } } });
  const saved = rows.find(r => r.slug === category.slug);
  invariant(saved ? saved.active : !rows.length || rows.some(r => r.active),
    "CATEGORY", 409, "Kategoria nuk është aktive.");
  return category;
}
