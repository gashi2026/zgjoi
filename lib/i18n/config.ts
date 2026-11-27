/**
 * Zgjoi languages. Albanian (sq) is the default and keeps the existing,
 * unprefixed URLs; English lives under /en (e.g. /en/kerko). The proxy
 * rewrites /en/* onto the same route tree and passes the locale in a request
 * header, so there is one set of pages for both languages.
 */
export const LOCALES = ["sq", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sq";
export const LOCALE_COOKIE = "zgjoi_locale";
/** Request header set by proxy.ts; never trusted from the client (the proxy overwrites it). */
export const LOCALE_HEADER = "x-zgjoi-locale";
/** Bare (unprefixed) pathname of the current page, set by proxy.ts for metadata. */
export const PATH_HEADER = "x-zgjoi-path";
export const SITE_ORIGIN = "https://zgjoi.com";
/** BCP 47 tags for <html lang>, hreflang and Intl. Kosovo Albanian / English. */
export const HTML_LANG: Record<Locale, string> = { sq: "sq", en: "en" };
export const INTL_LOCALE: Record<Locale, string> = { sq: "sq-XK", en: "en-GB" };

export const isLocale = (value: unknown): value is Locale =>
  value === "sq" || value === "en";

/** Split "/en/kerko" into { locale: "en", pathname: "/kerko" }. */
export function stripLocale(pathname: string): { locale: Locale | null; pathname: string } {
  if (pathname === "/en" || pathname.startsWith("/en/"))
    return { locale: "en", pathname: pathname.slice(3) || "/" };
  return { locale: null, pathname };
}

/** Prefix an internal path for a locale. External links, hashes, /api and files are left alone. */
export function localizePath(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/en" || href.startsWith("/en/") || href.startsWith("/en?") || href.startsWith("/en#")) return href;
  if (/^\/(api|_next)(\/|$)/.test(href) || /^\/[^?#]*\.[a-z0-9]{2,5}([?#]|$)/i.test(href)) return href;
  if (href === "/") return "/en";
  if (href.startsWith("/?") || href.startsWith("/#")) return `/en${href.slice(1)}`;
  return `/en${href}`;
}

/**
 * First visit only: English when the browser's most preferred language is
 * English; otherwise Albanian.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...rest] = part.trim().split(";");
      const q = rest.map((r) => r.trim()).find((r) => r.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return { tag: tag.toLowerCase(), quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((x) => x.tag && x.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return ranked[0]?.tag === "en" || ranked[0]?.tag.startsWith("en-") ? "en" : DEFAULT_LOCALE;
}
