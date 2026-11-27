"use client";
import { useMemo, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import { filterMunicipalities, resolveMunicipality } from "@/lib/kosovo-municipalities";
const inputClass =
  "min-w-0 max-w-full w-full rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";

/** Tick-box list of Kosovo municipalities, with a search box. */
export default function MunicipalityMultiSelect({
  name,
  values = [],
  required,
  label,
  hint,
}: {
  name: string;
  values?: string[];
  required?: boolean;
  label?: string;
  hint?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const initial = values.map((v) => resolveMunicipality(v)).filter((v): v is string => Boolean(v));
  const [picked, setPicked] = useState<string[]>(initial);
  const [query, setQuery] = useState("");
  const options = useMemo(() => filterMunicipalities(query, locale), [query, locale]);

  function toggle(city: string) {
    setPicked((list) => list.includes(city) ? list.filter((c) => c !== city) : [...list, city]);
  }

  return (
    <fieldset>
      {label && <legend className="text-sm font-semibold text-ink">{label}{required ? " *" : ""}</legend>}
      {hint && <p className="mt-1 text-sm font-normal text-muted">{hint}</p>}
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("municipality.search")} className={`${inputClass} mt-2`} />
      <div className="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-auto rounded-xl border border-line bg-white p-2 sm:grid-cols-2">
        {options.length ? options.map((o) => {
          const on = picked.includes(o.name);
          return (
            <label key={o.name} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${on ? "bg-honey" : "hover:bg-cream"}`}>
              <input type="checkbox" name={name} value={o.name} checked={on} onChange={() => toggle(o.name)} className="h-4 w-4 accent-[#E0A800]" />
              <span>{o.label}</span>
            </label>
          );
        }) : <p className="px-2 py-1 text-sm text-muted">{t("municipality.noMatches")}</p>}
      </div>
      <p className="mt-1 text-sm text-muted" role="status">{t("municipality.selectedCount", { count: picked.length })}</p>
    </fieldset>
  );
}
