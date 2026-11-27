import { proUserWhere } from "@/lib/server/id-verification";
import { categorySlugs, serviceCategory } from "@/lib/service-categories";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { publicProSelect, activeCategories } from "@/lib/server/catalog";
import Frame, { Panel } from "@/components/marketplace/Frame";
import CatalogCard from "@/components/marketplace/CatalogCard";
import ApiForm from "@/components/marketplace/ApiForm";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  const actor = await pageGuard("CLIENT");
  const categories = await activeCategories();
  const rows = await db.favorite.findMany({
    where: {
      userId: actor.id,
      profile: {
        verification: "APPROVED",
        user: proUserWhere(),
        categorySlug: { in: categories.flatMap((c) => categorySlugs(c.slug)) },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, profile: { select: publicProSelect } },
  });
  return (
    <Frame actor={actor} title={t("account.favourites")}>
      {!rows.length && (
        <Panel>
          {t("account.haventSavedAnyPros")}</Panel>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="space-y-2">
            <CatalogCard
              pro={row.profile}
              category={
                categories.find((c) => c.slug === serviceCategory(row.profile.categorySlug)?.slug)
                  ?.name
              }
            />
            <ApiForm
              endpoint="/api/favorites"
              values={{ profileId: row.profile.id, saved: false }}
              label={t("account.removeFromList")}
            />
          </div>
        ))}
      </div>
    </Frame>
  );
}
