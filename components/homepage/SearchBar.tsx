"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Search, MapPin, type LucideIcon } from "lucide-react";
import { categories, cities } from "@/lib/homepage-reference-data";

const normalize = (text: string) => text.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function SearchField({ value, onChange, label, options, icon: Icon, cityField = false }: {
  value: string; onChange: (value: string) => void; label: string;
  options: string[]; icon: LucideIcon; cityField?: boolean;
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
    <div className={`relative flex flex-1 items-center gap-2.5 rounded-full px-4 py-3 sm:py-2.5 ${cityField ? "border-t border-line sm:border-0" : ""}`}>
      <Icon size={18} className="shrink-0 text-muted" aria-hidden="true" />
      <input
        type="text" value={value} placeholder={label} aria-label={label}
        role="combobox" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={expanded ? id : undefined}
        aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
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
        <ul id={id} role="listbox" aria-label={label} className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {suggestions.map((option, index) => (
            <li key={option} role="presentation">
              <button id={`${id}-${index}`} type="button" role="option" aria-selected={active === index} tabIndex={-1}
                onPointerDown={(event) => event.preventDefault()} onClick={() => choose(option)}
                className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink hover:bg-cream ${active === index ? "bg-cream" : ""}`}>
                <Icon size={14} className="text-muted" />
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
      <form role="search" aria-label="Kërkoni profesionistë"
        className={`flex w-full flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-card sm:flex-row sm:items-center sm:rounded-full ${compact ? "" : "sm:p-2"}`}
        onSubmit={(event) => {
          event.preventDefault();
          const params = new URLSearchParams();
          if (query.trim()) params.set("q", query.trim());
          if (city.trim()) params.set("qyteti", city.trim());
          router.push(`/kerko${params.size ? `?${params}` : ""}`);
        }}>
        <SearchField value={query} onChange={setQuery} label="Çfarë shërbimi ju nevojitet?" options={categories.map((category) => category.name)} icon={Search} />
        <div className="hidden h-7 w-px bg-line sm:block" aria-hidden="true" />
        <SearchField cityField value={city} onChange={setCity} label="Komuna / Qyteti" options={cities} icon={MapPin} />
        <button type="submit" className="w-full rounded-full bg-gold px-7 py-3 text-sm font-semibold text-ink transition-all hover:bg-gold-dark hover:shadow-lift sm:w-auto">Kërko</button>
      </form>
  );
}
