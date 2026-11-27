import Link from "@/components/i18n/Link";
import { searchPros } from "@/lib/server/catalog";
import CatalogCard from "@/components/marketplace/CatalogCard";
import MunicipalitySelect from "@/components/marketplace/MunicipalitySelect";
import { getT, pageMetadata } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export const generateMetadata = () => pageMetadata({ title: "meta.searchTitle", canonical: "/kerko" });
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getT();
  const raw = await searchParams;
  const params: Record<string, string> = Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  let result;
  try {
    result = await searchPros(params);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return (
        <div className="mx-auto max-w-5xl p-8">
          <h1 className="text-2xl font-bold">{t("search.filtersArentValid")}</h1>
          <Link href="/kerko">{t("search.clearFiltersSearchAgain")}</Link>
        </div>
      );
    throw error;
  }
  const pageUrl = (page: number) =>
    `/kerko?${new URLSearchParams({ ...params, page: String(page) })}`;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("search.findPro")}</h1>
      <p className="mt-2 text-muted">
        {t("search.chooseProContactThem")}</p>
      <form
        action="/kerko"
        className="my-6 grid gap-2 rounded-2xl border border-line bg-cream p-3 sm:gap-3 sm:p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="text-sm">
          {t("search.serviceName")}<input
            name="q"
            defaultValue={params.q}
            maxLength={100}
            className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-base sm:h-auto sm:p-3"
          />
        </label>
        <label className="text-sm">
          {t("search.category")}<select
            name="kategoria"
            defaultValue={params.kategoria ?? ""}
            className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-base sm:h-auto sm:p-3"
          >
            <option value="">{t("search.all")}</option>
            {result.categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {t.tx(c.name)}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm">
          <span className="block">{t("search.city")}</span>
          <MunicipalitySelect name="qyteti" value={params.qyteti ?? ""} compact />
        </div>
        <label className="text-sm">
          {t("search.sort")}<select
            name="sort"
            defaultValue={params.sort ?? "rating"}
            className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-base sm:h-auto sm:p-3"
          >
            <option value="rating">{t("search.topRated")}</option>
            <option value="reviews">{t("search.mostReviews")}</option>
            <option value="price">{t("search.lowestPrice")}</option>
          </select>
        </label>
        <button className="h-11 self-end rounded-full bg-gold px-3 text-base font-semibold sm:h-auto sm:p-3">
          {t("search.search")}</button>
      </form>
      <p role="status" className="mb-4 text-muted">
        {t("search.approvedPros", { count: result.count })}</p>
      {result.pros.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.pros.map((pro) => (
            <CatalogCard
              key={pro.id}
              pro={pro}
              category={
                result.categories.find((c) => c.slug === pro.categorySlug)?.name
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line p-8">
          <h2 className="font-bold">
            {t("search.noProsFoundThese")}</h2>
          <p className="mt-2 text-muted">
            {t("search.tryAnotherCityCategory")}</p>
          <Link className="mt-3 inline-block text-gold-dark" href="/kerko">
            {t("search.clearFilters")}</Link>
        </div>
      )}
      <nav aria-label={t("search.resultPages")} className="mt-6 flex gap-5">
        {result.page > 1 && (
          <Link href={pageUrl(result.page - 1)}>{t("search.previousPage")}</Link>
        )}
        {result.page < result.pages && (
          <Link href={pageUrl(result.page + 1)}>{t("search.nextPage")}</Link>
        )}
      </nav>
    </div>
  );
}
