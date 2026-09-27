import Link from "next/link";
import { searchPros } from "@/lib/server/catalog";
import CatalogCard from "@/components/marketplace/CatalogCard";
import { cities } from "@/lib/data";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gjej profesionistë në Kosovë | Zgjoi",
  alternates: { canonical: "/kerko" },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
          <h1 className="text-2xl font-bold">Filtrat nuk janë të vlefshëm</h1>
          <Link href="/kerko">Pastro filtrat dhe kërko përsëri</Link>
        </div>
      );
    throw error;
  }
  const pageUrl = (page: number) =>
    `/kerko?${new URLSearchParams({ ...params, page: String(page) })}`;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Gjeni profesionistin tuaj</h1>
      <p className="mt-2 text-muted">
        Zgjidhni një profesionist dhe kontaktojeni privatisht me detajet e
        punës.
      </p>
      <form
        action="/kerko"
        className="my-6 grid gap-3 rounded-2xl border border-line bg-cream p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="text-sm">
          Shërbimi ose emri
          <input
            name="q"
            defaultValue={params.q}
            maxLength={100}
            className="mt-1 w-full rounded-xl border border-line p-3 text-base"
          />
        </label>
        <label className="text-sm">
          Kategoria
          <select
            name="kategoria"
            defaultValue={params.kategoria ?? ""}
            className="mt-1 w-full rounded-xl border border-line p-3 text-base"
          >
            <option value="">Të gjitha</option>
            {result.categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Qyteti
          <select
            name="qyteti"
            defaultValue={params.qyteti ?? ""}
            className="mt-1 w-full rounded-xl border border-line p-3 text-base"
          >
            <option value="">Të gjitha</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Renditja
          <select
            name="sort"
            defaultValue={params.sort ?? "rating"}
            className="mt-1 w-full rounded-xl border border-line p-3 text-base"
          >
            <option value="rating">Sipas vlerësimit</option>
            <option value="reviews">Më shumë vlerësime</option>
            <option value="price">Çmimi më i ulët</option>
          </select>
        </label>
        <button className="self-end rounded-full bg-gold p-3 font-semibold">
          Kërko
        </button>
      </form>
      <p role="status" className="mb-4 text-muted">
        {result.count} profesionistë të miratuar
      </p>
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
            Nuk u gjetën profesionistë për këto filtra.
          </h2>
          <p className="mt-2 text-muted">
            Provoni një qytet ose kategori tjetër.
          </p>
          <Link className="mt-3 inline-block text-gold-dark" href="/kerko">
            Pastro filtrat
          </Link>
        </div>
      )}
      <nav aria-label="Faqet e rezultateve" className="mt-6 flex gap-5">
        {result.page > 1 && (
          <Link href={pageUrl(result.page - 1)}>← Faqja e mëparshme</Link>
        )}
        {result.page < result.pages && (
          <Link href={pageUrl(result.page + 1)}>Faqja tjetër →</Link>
        )}
      </nav>
    </div>
  );
}
