"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, MapPin } from "lucide-react";
import { categories, cities } from "@/lib/data";

export default function SearchBar({
  initialQuery = "",
  initialCity = "",
  compact = false,
}: {
  initialQuery?: string;
  initialCity?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [querySuggestions, setQuerySuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showQuery, setShowQuery] = useState(false);
  const [showCity, setShowCity] = useState(false);
  const queryRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 1) { setQuerySuggestions([]); return; }
    const q = query.toLowerCase();
    const matches = categories
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((c) => c.name);
    setQuerySuggestions(matches);
  }, [query]);

  useEffect(() => {
    if (city.trim().length < 1) { setCitySuggestions([]); return; }
    const q = city.toLowerCase();
    const matches = cities.filter((c) => c.toLowerCase().startsWith(q)).slice(0, 6);
    setCitySuggestions(matches);
  }, [city]);

  // close dropdowns when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (queryRef.current && !queryRef.current.contains(e.target as Node)) setShowQuery(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setShowCity(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setShowQuery(false);
    setShowCity(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city.trim()) params.set("qyteti", city.trim());
    router.push(`/kerko${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function pickQuery(s: string) {
    setQuery(s);
    setQuerySuggestions([]);
    setShowQuery(false);
  }

  function pickCity(c: string) {
    setCity(c);
    setCitySuggestions([]);
    setShowCity(false);
  }

  return (
    <form
      onSubmit={submit}
      className={`flex w-full flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-card sm:flex-row sm:items-center sm:rounded-full ${compact ? "" : "sm:p-2"}`}
      role="search"
    >
      {/* service field */}
      <div ref={queryRef} className="relative flex flex-1 items-center gap-2.5 rounded-full px-4 py-3 sm:py-2.5">
        <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowQuery(true); }}
          onFocus={() => setShowQuery(true)}
          placeholder="Çfarë shërbimi ju nevojitet?"
          aria-label="Çfarë shërbimi ju nevojitet?"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          autoComplete="off"
        />
        {showQuery && querySuggestions.length > 0 && (
          <ul className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {querySuggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={() => pickQuery(s)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink hover:bg-cream"
                >
                  <Search size={14} className="text-muted" />
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden h-7 w-px bg-line sm:block" aria-hidden="true" />

      {/* city field */}
      <div ref={cityRef} className="relative flex flex-1 items-center gap-2.5 rounded-full border-t border-line px-4 py-3 sm:border-0 sm:py-2.5">
        <MapPin size={18} className="shrink-0 text-muted" aria-hidden="true" />
        <input
          type="text"
          value={city}
          onChange={(e) => { setCity(e.target.value); setShowCity(true); }}
          onFocus={() => setShowCity(true)}
          placeholder="Komuna / Qyteti"
          aria-label="Komuna / Qyteti"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          autoComplete="off"
        />
        {showCity && citySuggestions.length > 0 && (
          <ul className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {citySuggestions.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onMouseDown={() => pickCity(c)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink hover:bg-cream"
                >
                  <MapPin size={14} className="text-muted" />
                  {c}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-gold px-7 py-3 text-sm font-semibold text-ink transition-all hover:bg-gold-dark hover:shadow-lift sm:w-auto"
      >
        Kërko
      </button>
    </form>
  );
}
