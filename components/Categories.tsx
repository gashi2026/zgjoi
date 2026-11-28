import Link from "@/components/i18n/Link";
import { activeCategories, offeredSubjectSlugs } from "@/lib/server/catalog";
import { getT } from "@/lib/i18n/server";
import { visibleSubjects } from "@/lib/service-categories";
export default async function Categories() {
  const t = await getT();
  const [categories, offered] = await Promise.all([activeCategories(), offeredSubjectSlugs()]);
  return (
    <section id="kategorite" className="mx-auto max-w-7xl px-4 py-10">
      <h2 className="text-3xl font-bold">{t("categories.whatServiceDoNeed")}</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => {
          const subjects = visibleSubjects(c.slug, offered);
          // Kurse is a dropdown of subjects that already have a public pro. With none, it is a plain link.
          return subjects.length ? (
            <details key={c.id} data-testid={`category-menu-${c.slug}`} className="group rounded-2xl border border-line bg-cream p-4 font-semibold open:col-span-full open:border-gold">
              <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                {t.tx(c.name)}
                <span aria-hidden className="text-gold-dark transition-transform group-open:rotate-180">▾</span>
              </summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <li>
                  <Link href={`/kerko?kategoria=${encodeURIComponent(c.slug)}`} className="block min-h-11 rounded-xl border border-gold bg-honey px-3 py-3 text-sm font-semibold">
                    {t("search.allSubjects", { name: t.tx(c.name) })}
                  </Link>
                </li>
                {subjects.map((x) => (
                  <li key={x.slug}>
                    <Link href={`/kerko?kategoria=${encodeURIComponent(x.slug)}`} className="block min-h-11 rounded-xl border border-line bg-white px-3 py-3 text-sm font-medium hover:border-gold">
                      {t.tx(x.name)}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <Link
              key={c.id}
              href={`/kerko?kategoria=${encodeURIComponent(c.slug)}`}
              className="rounded-2xl border border-line bg-cream p-4 font-semibold hover:border-gold"
            >
              {t.tx(c.name)}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
