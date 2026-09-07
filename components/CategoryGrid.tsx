import Link from "next/link";
import CategoryIcon from "./CategoryIcon";

export default function CategoryGrid({ categories }: { categories: { slug: string; name: string; icon: string }[] }) {
  return (
    <section id="kategorite" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Çfarë shërbimi ju nevojitet?</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link key={category.slug} href={`/kerko?kategoria=${encodeURIComponent(category.slug)}`}
            className="group flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-line bg-white p-4 font-semibold transition-colors hover:border-gold hover:bg-cream sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-honey text-gold-dark"><CategoryIcon name={category.icon} size={24} /></span>
            <span className="min-w-0 break-words text-sm sm:text-base">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
