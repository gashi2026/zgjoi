"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Search, MapPin, type LucideIcon } from "lucide-react";
import { categories, cities } from "@/lib/data";

const normalize = (text: string) => text.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function SearchField({ value, onChange, label, options, icon: Icon }: {
  value: string; onChange: (value: string) => void; label: string;
  options: string[]; icon: LucideIcon;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = normalize(value)
    ? options.filter((option) => normalize(option).startsWith(normalize(value))).slice(0, 6)
    : [];
  const expanded = open && suggestions.length > 0;
  function choose(option: string) { onChange(option); setOpen(false); setActive(-1); }

  return (
    <div className="relative flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-3 focus-within:bg-cream">
      <Icon size={18} className="shrink-0 text-muted" aria-hidden="true" />
      <input
        type="text" value={value} placeholder={label} aria-label={label}
        role="combobox" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={expanded ? id : undefined}
        aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined}
        className="min-w-0 w-full bg-transparent text-base outline-none placeholder:text-muted"
        autoComplete="off"
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1); }}
        onKeyDown={(event) => {
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.length) {
            event.preventDefault(); setOpen(true);
            setActive((previous) => previous < 0
              ? event.key === "ArrowDown" ? 0 : suggestions.length - 1
              : (previous + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
          } else if (event.key === "Enter" && expanded && active >= 0) {
            event.preventDefault(); choose(suggestions[active]);
          } else if (event.key === "Escape") { setOpen(false); setActive(-1); }
        }}
      />
      {expanded && (
        <ul id={id} role="listbox" aria-label={label} className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-card">
          {suggestions.map((option, index) => (
            <li key={option} role="presentation">
              <button id={`${id}-${index}`} type="button" role="option" aria-selected={active === index} tabIndex={-1}
                onPointerDown={(event) => event.preventDefault()} onClick={() => choose(option)}
                className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-honey ${active === index ? "bg-honey" : ""}`}>
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchBar({ initialQuery = "", initialCity = "", compact = false }: {
  initialQuery?: string; initialCity?: string; compact?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  return (
    <div className="service-search min-w-0 w-full">
      <form role="search" aria-label="Kërkoni profesionistë"
        className={`service-search-form grid min-w-0 gap-1 rounded-2xl border border-line bg-white p-2 ${compact ? "" : "shadow-card"}`}
        onSubmit={(event) => {
          event.preventDefault();
          const params = new URLSearchParams();
          if (query.trim()) params.set("q", query.trim());
          if (city.trim()) params.set("qyteti", city.trim());
          router.push(`/kerko${params.size ? `?${params}` : ""}`);
        }}>
        <SearchField value={query} onChange={setQuery} label="Çfarë shërbimi ju nevojitet?" options={categories.map((category) => category.name)} icon={Search} />
        <SearchField value={city} onChange={setCity} label="Komuna / Qyteti" options={cities} icon={MapPin} />
        <button type="submit" className="min-h-12 rounded-xl bg-gold px-6 py-3 text-base font-semibold text-ink transition-colors hover:bg-gold-dark">Kërko</button>
      </form>
    </div>
  );
}
