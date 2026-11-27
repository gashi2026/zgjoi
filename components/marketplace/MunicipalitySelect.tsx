"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import { filterMunicipalities, municipalityLabel, resolveMunicipality } from "@/lib/kosovo-municipalities";
const inputClass =
  "min-w-0 max-w-full w-full rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";

/** Searchable single-municipality select. The form value is the official Albanian name. */
export default function MunicipalitySelect({
  name,
  value = "",
  required,
  label,
  onChange,
}: {
  name: string;
  value?: string;
  required?: boolean;
  label?: string;
  onChange?: (name: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const boxId = useId();
  const resolved = resolveMunicipality(value) ?? "";
  const unlisted = value.trim() && !resolved ? value.trim() : "";
  const [chosen, setChosen] = useState<string | null>(null);
  const picked = chosen ?? resolved;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const options = useMemo(() => filterMunicipalities(open ? query : "", locale), [open, query, locale]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(city: string) {
    setChosen(city);
    setQuery("");
    setOpen(false);
    onChange?.(city);
  }

  const display = open ? query : (picked ? municipalityLabel(picked, locale) : "");
  return (
    <div ref={root} className="relative">
      {label && (
        <span className="block text-sm font-semibold text-ink">
          {label}{required ? " *" : ""}
        </span>
      )}
      <input type="hidden" name={name} value={picked} required={required} />
      <input
        id={boxId}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${boxId}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        value={display}
        required={required && !picked}
        placeholder={t("municipality.search")}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        className={`${inputClass} mt-1`}
      />
      {unlisted && !picked && (
        <span className="mt-1 block text-sm font-normal text-red-700">{t("municipality.unlisted", { value: unlisted })}</span>
      )}
      {open && (
        <ul id={`${boxId}-list`} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-white p-1 shadow-soft">
          {options.length ? options.map((o) => (
            <li key={o.name} role="option" aria-selected={o.name === picked}>
              <button type="button" className={`w-full rounded-lg px-3 py-2 text-left text-sm ${o.name === picked ? "bg-honey font-semibold" : "hover:bg-cream"}`} onClick={() => choose(o.name)}>
                {o.label}
              </button>
            </li>
          )) : (
            <li className="px-3 py-2 text-sm text-muted">{t("municipality.noMatches")}</li>
          )}
        </ul>
      )}
    </div>
  );
}
