import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { invariant } from "./errors";
import type { Actor } from "./auth";

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
  ratingAvg: true,
  ratingCount: true,
  serviceCities: true,
  experience: true,
  user: { select: { name: true, city: true } },
  services: { select: { id: true, name: true, price: true } },
  availability: { select: { weekday: true, startMin: true, endMin: true } },
} satisfies Prisma.ProProfileSelect;

export async function activeCategories() {
  return db.category.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, icon: true },
  });
}

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
  const where: Prisma.ProProfileWhereInput = {
    verification: "APPROVED",
    user: { suspendedAt: null, role: "PRO" },
    categorySlug: {
      in: categories
        .filter((c) => !p.kategoria || c.slug === p.kategoria)
        .map((c) => c.slug),
    },
    ratingAvg: { gte: p.minRating },
    ...(p.maxPrice ? { priceFrom: { lte: Math.round(p.maxPrice * 100) } } : {}),
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
                  categorySlug: {
                    in: categories
                      .filter((c) =>
                        `${c.name} ${c.slug}`
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
                      .map((c) => c.slug),
                  },
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
      ? [{ priceFrom: "asc" }, { id: "asc" }]
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
    pros,
    count,
    page: p.page,
    pages: Math.ceil(count / 18),
    categories,
  };
}

export async function publicProfile(id: string) {
  const categories = await activeCategories();
  return db.proProfile.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      verification: "APPROVED",
      user: { suspendedAt: null, role: "PRO" },
      categorySlug: { in: categories.map((c) => c.slug) },
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
