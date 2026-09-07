import Link from "next/link";
import { activeCategories } from "@/lib/server/catalog";
export default async function Categories() {
  const categories = await activeCategories();
  return (
    <section id="kategorite" className="mx-auto max-w-7xl px-4 py-10">
      <h2 className="text-3xl font-bold">Çfarë shërbimi ju nevojitet?</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/kerko?kategoria=${encodeURIComponent(c.slug)}`}
            className="rounded-2xl border border-line bg-cream p-4 font-semibold hover:border-gold"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
