import Link from "next/link";
import { searchPros } from "@/lib/server/catalog";
import CatalogCard from "./marketplace/CatalogCard";
export default async function RecommendedPros() {
  const { pros, categories } = await searchPros();
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-3xl font-bold">Profesionistë në Zgjoi</h2>
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
          Po përgatisim rrjetin e profesionistëve. Mund të regjistroheni për
          shqyrtimin e profilit tuaj.
        </p>
      )}
      <Link className="mt-6 inline-block text-gold-dark" href="/kerko">
        Shiko të gjithë profesionistët →
      </Link>
    </section>
  );
}
