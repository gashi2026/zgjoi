import { categorySlugs, serviceCategory } from "../service-categories";
import { activeServiceCategories } from "./service-catalog";
import "server-only";
import { proUserWhere } from "./id-verification";
import { publicCategoriesSelect } from "./pro-categories";
import { displayRate, publicCategories } from "../pro-categories";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { invariant } from "./errors";
import type { Actor } from "./auth";
import { translateText } from "../i18n/dictionaries";

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
export const publicProSelect = {
  id: true,
  slug: true,
  about: true,
  categorySlug: true,
  priceFrom: true,
  hourlyRateCents: true,
  bookNowEnabled: true,
  bookingMinMinutes: true,
  ratingAvg: true,
  ratingCount: true,
  serviceCities: true,
  experience: true,
  user: { select: { name: true, city: true } },
  services: { select: { id: true, name: true, price: true } },
  categories: publicCategoriesSelect,
  availability: { select: { weekday: true, startMin: true, endMin: true } },
} satisfies Prisma.ProProfileSelect;

export const activeCategories = activeServiceCategories;

export async function searchPros(input: Record<string, unknown> = {}) {
  const p = z
    .object({
      q: z.string().trim().max(100).default(""),
      kategoria: z.string().max(80).default(""),
      qyteti: z.string().max(60).default(""),
      sort: z.enum(["rating", "reviews", "price"]).default("rating"),
      page: z.coerce.number().int().min(1).max(1000).default(1),
      minRating: z.coerce.number().min(0).max(5).default(0),
      maxPrice: z.coerce.number().min(0).max(100000).optional(),
    })
    .parse(input);
  const categories = await activeCategories();
  const active = categories.map((c) => c.slug);
  const wanted = categories.filter((c) => !p.kategoria || c.slug === serviceCategory(p.kategoria)?.slug).map((c) => c.slug);
  // A pro matches through any of their approved professions; the price filter applies to the
  // profession searched for (pros without a price are left out when a maximum price is set).
  const where: Prisma.ProProfileWhereInput = {
    verification: "APPROVED",
    user: proUserWhere(),
    categories: { some: { categorySlug: { in: wanted.flatMap((c) => categorySlugs(c)) }, approvedAt: { not: null },
      ...(p.maxPrice ? { priceFromCents: { lte: Math.round(p.maxPrice * 100) } } : {}) } },
    ratingAvg: { gte: p.minRating },
    AND: [
      ...(p.q
        ? [
            {
              OR: [
                {
                  user: {
                    name: { contains: p.q, mode: "insensitive" as const },
                  },
                },
                { about: { contains: p.q, mode: "insensitive" as const } },
                {
                  services: {
                    some: {
                      name: { contains: p.q, mode: "insensitive" as const },
                    },
                  },
                },
                {
                  categories: { some: { approvedAt: { not: null }, categorySlug: {
                    in: categories
                      .filter((c) =>
                        `${c.name} ${translateText(c.name, "en")} ${c.slug}`
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .includes(
                            p.q
                              .toLowerCase()
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, ""),
                          ),
                      )
                      .flatMap((c) => categorySlugs(c.slug)),
                  } } },
                },
              ],
            },
          ]
        : []),
      ...(p.qyteti
        ? [
            {
              OR: [
                { serviceCities: { has: p.qyteti } },
                {
                  user: {
                    city: { equals: p.qyteti, mode: "insensitive" as const },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };
  const orderBy: Prisma.ProProfileOrderByWithRelationInput[] =
    p.sort === "price"
      ? [{ priceFrom: { sort: "asc", nulls: "last" } }, { id: "asc" }]
      : p.sort === "reviews"
        ? [{ ratingCount: "desc" }, { id: "asc" }]
        : [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { id: "asc" }];
  const [pros, count] = await Promise.all([
    db.proProfile.findMany({
      where,
      select: publicProSelect,
      orderBy,
      skip: (p.page - 1) * 18,
      take: 18,
    }),
    db.proProfile.count({ where }),
  ]);
  return {
    pros: pros.map(pro => withDisplayCategory(pro, active, p.kategoria)),
    count,
    page: p.page,
    pages: Math.ceil(count / 18),
    categories,
  };
}

type WithCategories = { categorySlug: string; priceFrom: number | null; hourlyRateCents: number | null;
  categories: { categorySlug: string; priceFromCents: number | null; hourlyRateCents: number | null; position: number; approvedAt: Date | null }[] };
/** Public view of a pro: only approved, active professions (primary first); `categorySlug` is the
 * profession to show on a card (the one searched for, else the first), `priceFrom` its price,
 * `displayRateCents` its hourly rate (else the lowest). */
export function withDisplayCategory<T extends WithCategories>(pro: T, active: readonly string[], wanted?: string) {
  const rows = publicCategories(pro.categories, active).map((r) => ({ ...r, categorySlug: serviceCategory(r.categorySlug)!.slug }));
  const show = rows.find((r) => r.categorySlug === serviceCategory(wanted ?? "")?.slug) ?? rows[0];
  return { ...pro, categories: rows, categorySlug: show?.categorySlug ?? pro.categorySlug, priceFrom: show ? show.priceFromCents : pro.priceFrom,
    // Card rate: the searched profession's rate, else the lowest of the pro's professions.
    displayRateCents: displayRate(rows, pro.hourlyRateCents, wanted || null) };
}

export async function publicProfile(id: string) {
  const categories = await activeCategories();
  const profile = await db.proProfile.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      verification: "APPROVED",
      user: proUserWhere(),
      categories: { some: { categorySlug: { in: categories.flatMap((c) => categorySlugs(c.slug)) }, approvedAt: { not: null } } },
    },
    select: {
      ...publicProSelect,
      reviews: {
        where: { state: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          rating: true,
          text: true,
          createdAt: true,
          author: { select: { name: true, city: true } },
        },
      },
    },
  });
  return profile ? withDisplayCategory(profile, categories.map((c) => c.slug)) : null;
}

export async function favorite(
  actor: Actor,
  profileId: string,
  saved: boolean,
) {
  invariant(
    actor.role === "CLIENT",
    "FORBIDDEN",
    403,
    "Kjo veçori është për klientët.",
  );
  invariant(
    await publicProfile(profileId),
    "NOT_FOUND",
    404,
    "Profesionisti nuk u gjet.",
  );
  if (saved)
    await db.favorite.upsert({
      where: { userId_profileId: { userId: actor.id, profileId } },
      create: { userId: actor.id, profileId },
      update: {},
    });
  else await db.favorite.deleteMany({ where: { userId: actor.id, profileId } });
  return { ok: true, saved };
}
