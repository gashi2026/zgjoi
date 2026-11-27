import Link from "@/components/i18n/Link";
import { searchPros } from "@/lib/server/catalog";
import CatalogCard from "./marketplace/CatalogCard";
import { getT } from "@/lib/i18n/server";
export default async function RecommendedPros() {
  const t = await getT();
  const { pros, categories } = await searchPros();
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-3xl font-bold">{t("recommendedPros.prosZgjoi")}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pros.slice(0, 6).map((pro) => (
          <CatalogCard
            key={pro.id}
            pro={pro}
            category={categories.find((c) => c.slug === pro.categorySlug)?.name}
          />
        ))}
      </div>
      {!pros.length && (
        <p className="mt-4 text-muted">
          {t("recommendedPros.wereBuildingOurNetwork")}</p>
      )}
      <Link className="mt-6 inline-block text-gold-dark" href="/kerko">
        {t("recommendedPros.seeAllPros")}</Link>
    </section>
  );
}
