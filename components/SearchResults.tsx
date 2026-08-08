"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, SearchX, SlidersHorizontal, X } from "lucide-react";
import SearchBar from "./SearchBar";
import ProCard from "./ProCard";
import { categories, cities, professionals } from "@/lib/data";

type Sort = "vleresimi" | "komentet" | "cmimi";

const availability = [
  { key: "sot", label: "Sot" },
  { key: "neser", label: "Nesër" },
  { key: "kete-jave", label: "Këtë javë" },
] as const;

function FilterPanel({
  category,
  setCategory,
  city,
  setCity,
  minRating,
  setMinRating,
  maxPrice,
  setMaxPrice,
  avail,
  toggleAvail,
  onReset,
}: {
  category: string;
  setCategory: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  minRating: number;
  setMinRating: (v: number) => void;
  maxPrice: number;
  setMaxPrice: (v: number) => void;
  avail: string[];
  toggleAvail: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h3 className="text-sm font-bold text-ink">Kategoria</h3>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-2.5 w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-gold"
          aria-label="Zgjidh kategorinë"
        >
          <option value="">Të gjitha kategoritë</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <h3 className="text-sm font-bold text-ink">Qyteti</h3>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-2.5 w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-gold"
          aria-label="Zgjidh qytetin"
        >
          <option value="">Të gjitha qytetet</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Rating */}
      <div>
        <h3 className="text-sm font-bold text-ink">Vlerësimi minimal</h3>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {[0, 4, 4.5, 4.8].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMinRating(r)}
              aria-pressed={minRating === r}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                minRating === r
                  ? "border-gold bg-honey text-ink"
                  : "border-line bg-white text-muted hover:border-gold"
              }`}
            >
              {r === 0 ? "Të gjitha" : `${r}★+`}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <h3 className="flex items-baseline justify-between text-sm font-bold text-ink">
          Çmimi fillestar
          <span className="text-sm font-semibold text-gold-dark">
            deri {maxPrice} €
          </span>
        </h3>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="mt-3 w-full accent-gold"
          aria-label="Çmimi maksimal fillestar në euro"
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>10 €</span>
          <span>100 €</span>
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="text-sm font-bold text-ink">Disponueshmëria</h3>
        <div className="mt-2.5 space-y-2">
          {availability.map((a) => (
            <label key={a.key} className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={avail.includes(a.key)}
                onChange={() => toggleAvail(a.key)}
                className="h-4 w-4 accent-gold"
              />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-gold hover:text-gold-dark"
      >
        Pastro filtrat
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-line bg-white p-5">
      <div className="mx-auto h-[72px] w-[72px] rounded-full bg-cream" />
      <div className="mx-auto mt-4 h-4 w-2/3 rounded bg-cream" />
      <div className="mx-auto mt-2 h-3 w-1/2 rounded bg-cream" />
      <div className="mx-auto mt-3 h-3 w-3/4 rounded bg-cream" />
      <div className="mt-5 h-10 rounded-full bg-cream" />
    </div>
  );
}

export default function SearchResults() {
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("kategoria") ?? "");
  const [city, setCity] = useState(params.get("qyteti") ?? "");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100);
  const [avail, setAvail] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("vleresimi");
  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync state from URL params
  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setCategory(params.get("kategoria") ?? "");
    setCity(params.get("qyteti") ?? "");
  }, [params]);

  // Brief simulated loading state on any filter change
  useEffect(() => {
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 400);
    return () => window.clearTimeout(t);
  }, [query, category, city, minRating, maxPrice, avail, sort]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  function toggleAvail(key: string) {
    setAvail((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function reset() {
    setCategory("");
    setCity("");
    setMinRating(0);
    setMaxPrice(100);
    setAvail([]);
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = professionals.filter((p) => {
      if (category && p.category !== category) return false;
      if (city && p.city !== city) return false;
      if (p.rating < minRating) return false;
      if (p.priceFrom > maxPrice) return false;
      if (avail.length > 0 && !avail.includes(p.available)) return false;
      if (q) {
        const hay = `${p.name} ${p.profession} ${p.category} ${p.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "vleresimi") return b.rating - a.rating;
      if (sort === "komentet") return b.reviews - a.reviews;
      return a.priceFrom - b.priceFrom;
    });
    return list;
  }, [query, category, city, minRating, maxPrice, avail, sort]);

  const filterProps = {
    category,
    setCategory,
    city,
    setCity,
    minRating,
    setMinRating,
    maxPrice,
    setMaxPrice,
    avail,
    toggleAvail,
    onReset: reset,
  };

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SearchBar initialQuery={query} initialCity={city} compact />

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Desktop filters */}
          <aside className="hidden self-start rounded-2xl border border-line bg-white p-6 shadow-soft lg:block">
            <h2 className="mb-5 text-base font-extrabold text-ink">Filtrat</h2>
            <FilterPanel {...filterProps} />
          </aside>

          {/* Results */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted" aria-live="polite">
                {loading ? (
                  "Duke kërkuar..."
                ) : (
                  <>
                    <span className="font-bold text-ink">{results.length}</span>{" "}
                    profesionistë u gjetën
                  </>
                )}
              </p>

              <div className="flex items-center gap-2">
                {/* Mobile filter button */}
                <button
                  type="button"
                  onClick={() => setDrawer(true)}
                  className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink lg:hidden"
                >
                  <SlidersHorizontal size={15} />
                  Filtrat
                </button>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    aria-label="Rendit sipas"
                    className="appearance-none rounded-full border border-line bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-ink outline-none focus:border-gold"
                  >
                    <option value="vleresimi">Vlerësimi më i lartë</option>
                    <option value="komentet">Më shumë komente</option>
                    <option value="cmimi">Çmimi më i ulët</option>
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey">
                    <SearchX size={28} className="text-gold-dark" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-ink">
                    Asnjë rezultat nuk u gjet
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-muted">
                    Provoni një kërkim tjetër, ndryshoni qytetin ose pastroni
                    filtrat për të parë më shumë profesionistë.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      reset();
                    }}
                    className="mt-5 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark"
                  >
                    Pastro kërkimin
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((pro) => (
                    <ProCard key={pro.id} pro={pro} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtrat">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawer(false)}
            aria-label="Mbyll filtrat"
            tabIndex={-1}
          />
          <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-extrabold text-ink">Filtrat</h2>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink"
                aria-label="Mbyll"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterPanel {...filterProps} />
            </div>
            <div className="border-t border-line p-4">
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="w-full rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark"
              >
                Shfaq {results.length} rezultate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
