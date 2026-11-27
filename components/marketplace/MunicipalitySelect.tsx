"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import { filterMunicipalities, municipalityLabel, resolveMunicipality } from "@/lib/kosovo-municipalities";

const fieldInputClass =
  "min-w-0 max-w-full w-full rounded-xl border border-line bg-white px-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 h-11 sm:h-auto sm:py-3";

/** Searchable single-municipality select. The form value is the official Albanian name.
 *  `plain` is for the compact search bars: no box of its own, same height as the text field.
 *  The option list is a fixed overlay (max-height 50vh) so it never stretches the layout. */
export default function MunicipalitySelect({
  name,
  value = "",
  required,
  label,
  onChange,
  variant = "field",
  compact = false,
}: {
  name: string;
  value?: string;
  required?: boolean;
  label?: string;
  onChange?: (name: string) => void;
  variant?: "field" | "plain";
  compact?: boolean;
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
  const [menu, setMenu] = useState<{ top: number; left: number; width: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => filterMunicipalities(open ? query : "", locale), [open, query, locale]);
  const typed = resolveMunicipality(query) ?? "";
  const valueOut = picked || typed;
  const plain = variant === "plain";

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const placeMenu = useCallback(() => {
    const box = (plain ? root.current : inputRef.current)?.getBoundingClientRect();
    if (!box) return;
    setMenu({ top: box.bottom + 4, left: box.left, width: box.width });
  }, [plain]);

  useEffect(() => {
    if (!open) return;
    const update = () => placeMenu();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, placeMenu]);

  function choose(city: string) {
    setChosen(city);
    setQuery("");
    setOpen(false);
    onChange?.(city);
  }

  const display = open ? query : (picked ? municipalityLabel(picked, locale) : "");
  const inputClass = plain
    ? "min-w-0 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
    : `${fieldInputClass} ${label || compact ? "mt-1" : ""}`;

  return (
    <div
      ref={root}
      className={
        plain
          ? "search-city relative flex h-11 min-w-0 flex-1 items-center gap-2.5 px-3 sm:h-auto sm:min-h-12 sm:py-3"
          : "relative"
      }
    >
      {label && (
        <span className="block text-sm font-semibold text-ink">
          {label}{required ? " *" : ""}
        </span>
      )}
      {plain && <MapPin size={18} className="shrink-0 text-muted" aria-hidden="true" />}
      <input type="hidden" name={name} value={valueOut} required={required} />
      <input
        ref={inputRef}
        id={boxId}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${boxId}-list`}
        aria-autocomplete="list"
        aria-label={plain ? (label ?? t("searchBar.municipalityCity")) : undefined}
        autoComplete="off"
        value={display}
        required={required && !valueOut}
        placeholder={plain ? (label ?? t("searchBar.municipalityCity")) : t("municipality.search")}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          placeMenu();
          const match = resolveMunicipality(next);
          if (match) onChange?.(match);
          else if (!next.trim()) {
            setChosen("");
            onChange?.("");
          }
        }}
        onFocus={() => { setQuery(""); setOpen(true); placeMenu(); }}
        className={inputClass}
      />
      {unlisted && !picked && (
        <span className="mt-1 block text-sm font-normal text-red-700">{t("municipality.unlisted", { value: unlisted })}</span>
      )}
      {open && menu && (
        <ul
          id={`${boxId}-list`}
          role="listbox"
          className="fixed z-[80] max-h-[50vh] overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-card"
          style={{ top: menu.top, left: menu.left, width: menu.width }}
        >
          {options.length ? options.map((o) => (
            <li key={o.name} role="option" aria-selected={o.name === picked}>
              <button type="button" className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm ${o.name === picked ? "bg-honey font-semibold" : "hover:bg-cream"}`} onClick={() => choose(o.name)}>
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
