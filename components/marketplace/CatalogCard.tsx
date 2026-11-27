import Link from "@/components/i18n/Link";
import type { Prisma } from "@prisma/client";
import { publicProSelect, initials } from "@/lib/server/catalog";
import { money } from "@/lib/format";
import { displayRate } from "@/lib/pro-categories";
import { Avatar } from "@/components/Brand";
import { getT } from "@/lib/i18n/server";
export type CatalogPro = Prisma.ProProfileGetPayload<{
  select: typeof publicProSelect;
}>;
export default async function CatalogCard({
  pro,
  category,
}: {
  pro: CatalogPro & { displayRateCents?: number | null };
  category?: string;
}) {
  const t = await getT();
  const rate = pro.displayRateCents !== undefined ? pro.displayRateCents
    : displayRate(pro.categories, pro.hourlyRateCents, null);
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar initials={initials(pro.user.name)} hue={42} size={48} />
        <div>
          <h2 className="text-lg font-bold">
            <Link href={`/profesionisti/${pro.slug}`}>{pro.user.name}</Link>
          </h2>
          <p className="text-sm text-muted">
            {category ? t.tx(category) : pro.categorySlug}
            {pro.categories.length > 1 && <span title={t("catalogCard.moreProfessions", { count: pro.categories.length - 1 })}> +{pro.categories.length - 1}</span>}
            {" "}· {pro.user.city}
          </p>
        </div>
      </div>
      <p className="line-clamp-3 text-sm text-muted">{pro.about}</p>
      <p className="text-sm">
        {pro.ratingCount
          ? t("catalogCard.reviews", { value: pro.ratingAvg.toFixed(1), ratingCount: pro.ratingCount })
          : t("catalogCard.noReviewsYet")}{" "}
        {pro.priceFrom ? t("catalogCard.from", { amount: money(pro.priceFrom, t.locale) }) : t("catalogCard.askForPrice")}
        {rate ? ` · ${t("catalogCard.hourlyRate", { amount: money(rate, t.locale) })}` : ""}</p>
      <Link
        href={`/profesionisti/${pro.slug}`}
        className="mt-auto rounded-full border border-gold px-4 py-3 text-center text-sm font-semibold"
      >
        {t("catalogCard.viewProfile")}</Link>
    </article>
  );
}
