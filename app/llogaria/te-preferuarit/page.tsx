import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { publicProSelect, activeCategories } from "@/lib/server/catalog";
import Frame, { Panel } from "@/components/marketplace/Frame";
import CatalogCard from "@/components/marketplace/CatalogCard";
import ApiForm from "@/components/marketplace/ApiForm";
export default async function Page() {
  const actor = await pageGuard("CLIENT");
  const categories = await activeCategories();
  const rows = await db.favorite.findMany({
    where: {
      userId: actor.id,
      profile: {
        verification: "APPROVED",
        user: { suspendedAt: null, role: "PRO" },
        categorySlug: { in: categories.map((c) => c.slug) },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, profile: { select: publicProSelect } },
  });
  return (
    <Frame actor={actor} title="Të preferuarit">
      {!rows.length && (
        <Panel>
          Nuk keni ruajtur profesionistë ende. Përdorni butonin në profilin e
          profesionistit.
        </Panel>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="space-y-2">
            <CatalogCard
              pro={row.profile}
              category={
                categories.find((c) => c.slug === row.profile.categorySlug)
                  ?.name
              }
            />
            <ApiForm
              endpoint="/api/favorites"
              values={{ profileId: row.profile.id, saved: false }}
              label="Hiq nga lista"
            />
          </div>
        ))}
      </div>
    </Frame>
  );
}
