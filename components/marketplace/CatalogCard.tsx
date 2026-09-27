import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { publicProSelect, initials } from "@/lib/server/catalog";
import { money } from "@/lib/format";
import { Avatar } from "@/components/Brand";
export type CatalogPro = Prisma.ProProfileGetPayload<{
  select: typeof publicProSelect;
}>;
export default function CatalogCard({
  pro,
  category,
}: {
  pro: CatalogPro;
  category?: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar initials={initials(pro.user.name)} hue={42} size={48} />
        <div>
          <h2 className="text-lg font-bold">
            <Link href={`/profesionisti/${pro.slug}`}>{pro.user.name}</Link>
          </h2>
          <p className="text-sm text-muted">
            {category ?? pro.categorySlug} · {pro.user.city}
          </p>
        </div>
      </div>
      <p className="line-clamp-3 text-sm text-muted">{pro.about}</p>
      <p className="text-sm">
        {pro.ratingCount
          ? `★ ${pro.ratingAvg.toFixed(1)} · ${pro.ratingCount} vlerësime`
          : "Pa vlerësime ende"}{" "}
        · Nga {money(pro.priceFrom)}
      </p>
      <Link
        href={`/profesionisti/${pro.slug}`}
        className="mt-auto rounded-full border border-gold px-4 py-3 text-center text-sm font-semibold"
      >
        Shiko profilin
      </Link>
    </article>
  );
}
