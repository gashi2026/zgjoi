"use client";
import { useState } from "react";
import { useBarePathname, useLocale, useT } from "@/lib/i18n/client";
import { localizePath, type Locale } from "@/lib/i18n/config";

/**
 * SQ / EN switcher. Each option is a real link to the same page in that
 * language (works without JavaScript and for crawlers); with JavaScript the
 * choice is first saved (cookie + profile when signed in), then the page reloads.
 */
export default function LanguageSwitcher({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const t = useT();
  const locale = useLocale();
  const bare = useBarePathname();
  const [busy, setBusy] = useState(false);
  const options: { value: Locale; short: string; label: string }[] = [
    { value: "sq", short: t("common.languageSq"), label: t("common.switchToAlbanian") },
    { value: "en", short: t("common.languageEn"), label: t("common.switchToEnglish") },
  ];

  async function choose(event: React.MouseEvent<HTMLAnchorElement>, value: Locale) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (value === locale || busy) return;
    setBusy(true);
    const target = localizePath(bare, value) + window.location.search + window.location.hash;
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: value }),
      });
    } catch {
      // The /en prefix (or its absence) still sets the language via the proxy.
    }
    window.location.assign(target);
  }

  const dark = tone === "dark";
  return (
    <div
      role="group"
      aria-label={t("common.languageSwitcher")}
      className={`inline-flex shrink-0 items-center rounded-full border p-0.5 text-xs font-bold ${
        dark ? "border-white/25" : "border-line bg-white"
      } ${className}`}
    >
      {options.map((o) => {
        const active = o.value === locale;
        return (
          <a
            key={o.value}
            href={localizePath(bare, o.value)}
            hrefLang={o.value}
            lang={o.value}
            aria-current={active ? "true" : undefined}
            aria-label={o.label}
            title={o.label}
            onClick={(e) => choose(e, o.value)}
            className={`flex h-8 min-w-9 items-center justify-center rounded-full px-2.5 transition-colors ${
              active
                ? "bg-gold text-ink"
                : dark
                  ? "text-white/80 hover:text-white"
                  : "text-muted hover:text-ink"
            }`}
          >
            {o.short}
          </a>
        );
      })}
    </div>
  );
}
