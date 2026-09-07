import type { MetadataRoute } from "next";
import { db } from "@/lib/server/db";
import { activeCategories } from "@/lib/server/catalog";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.ZGJOI_PASSWORD || process.env.VERCEL_ENV === "preview")
    return [];
  const categories = await activeCategories();
  const profiles = await db.proProfile.findMany({
    where: {
      verification: "APPROVED",
      user: { suspendedAt: null, role: "PRO" },
      categorySlug: { in: categories.map((c) => c.slug) },
    },
    take: 5000,
    orderBy: { id: "asc" },
    select: { slug: true, updatedAt: true },
  });
  return [
    ...[
      "",
      "/kerko",
      "/kategorite",
      "/profesionistet",
      "/si-funksionon",
      "/rreth-nesh",
    ].map((path) => ({ url: `https://zgjoi.com${path}` })),
    ...profiles.map((profile) => ({
      url: `https://zgjoi.com/profesionisti/${profile.slug}`,
      lastModified: profile.updatedAt,
    })),
  ];
}
