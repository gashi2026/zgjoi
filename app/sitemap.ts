import { proUserWhere } from "@/lib/server/id-verification";
import { categorySlugs } from "@/lib/service-categories";
import type { MetadataRoute } from "next";
import { db } from "@/lib/server/db";
import { activeCategories } from "@/lib/server/catalog";
import { localizePath } from "@/lib/i18n/config";

/** One entry per language, each listing both versions (hreflang alternates). */
function bothLanguages(path: string, lastModified?: Date): MetadataRoute.Sitemap {
  const sq = `https://zgjoi.com${path || ""}`;
  const en = `https://zgjoi.com${localizePath(path || "/", "en")}`;
  const alternates = { languages: { sq, en, "x-default": sq } };
  return [
    { url: sq, lastModified, alternates },
    { url: en, lastModified, alternates },
  ];
}
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.ZGJOI_PASSWORD || process.env.VERCEL_ENV === "preview")
    return [];
  const categories = await activeCategories();
  const profiles = await db.proProfile.findMany({
    where: {
      verification: "APPROVED",
      user: proUserWhere(),
      categorySlug: { in: categories.flatMap((c) => categorySlugs(c.slug)) },
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
    ].flatMap((path) => bothLanguages(path)),
    ...profiles.flatMap((profile) => bothLanguages(`/profesionisti/${profile.slug}`, profile.updatedAt)),
  ];
}
