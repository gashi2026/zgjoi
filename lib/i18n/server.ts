import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Metadata } from "next";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER, localizePath, PATH_HEADER, SITE_ORIGIN, type Locale } from "./config";
import type { MessageKey } from "./messages/sq";
import { tFor } from "./dictionaries";
import type { T } from "./translate";
export { tFor, translateText } from "./dictionaries";

/**
 * The request's language. proxy.ts resolves it (URL prefix → cookie → first
 * visit Accept-Language) and passes it in a header. Outside a request (cron,
 * scripts, tests) this is Albanian.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const fromProxy = (await headers()).get(LOCALE_HEADER);
    if (isLocale(fromProxy)) return fromProxy;
    const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
});

/** Unprefixed path of the current page (for hreflang/canonical). */
export async function getBarePath() {
  try {
    return (await headers()).get(PATH_HEADER) || "/";
  } catch {
    return "/";
  }
}

export const getT = cache(async (): Promise<T> => tFor(await getLocale()));

/** Localised internal href for server-side redirects and links. */
export async function localHref(href: string) {
  return localizePath(href, await getLocale());
}

/** hreflang alternates for a bare path: Albanian unprefixed, English under /en. */
export function languageAlternates(barePath: string) {
  const path = barePath === "/" ? "" : barePath;
  return {
    sq: `${SITE_ORIGIN}${path || "/"}`,
    en: `${SITE_ORIGIN}${localizePath(path || "/", "en")}`,
    "x-default": `${SITE_ORIGIN}${path || "/"}`,
  };
}

/** Localised title/description plus canonical + hreflang for the current page. */
export async function pageMetadata(opts: {
  title?: MessageKey; description?: MessageKey; robots?: Metadata["robots"]; canonical?: string;
} = {}): Promise<Metadata> {
  const [t, locale, bare] = await Promise.all([getT(), getLocale(), getBarePath()]);
  const canonicalBare = opts.canonical ?? bare;
  return {
    ...(opts.title ? { title: t(opts.title) } : {}),
    ...(opts.description ? { description: t(opts.description) } : {}),
    ...(opts.robots ? { robots: opts.robots } : {}),
    alternates: { canonical: localizePath(canonicalBare, locale), languages: languageAlternates(canonicalBare) },
  };
}
