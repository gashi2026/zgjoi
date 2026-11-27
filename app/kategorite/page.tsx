import Categories from "@/components/Categories";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const t = await getT();
  return (
    <div>
      <h1 className="sr-only">{t("categories.serviceCategories")}</h1>
      <Categories />
    </div>
  );
}
