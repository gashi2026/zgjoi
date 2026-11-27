"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter as useNextRouter } from "next/navigation";
import { DEFAULT_LOCALE, localizePath, stripLocale, type Locale } from "./config";
import { createT, type Catalog, type Dictionary, type T } from "./translate";

type Value = { locale: Locale; t: T };
const I18nContext = createContext<Value | null>(null);

export function I18nProvider({ locale, messages, catalog, children }: {
  locale: Locale; messages: Dictionary; catalog: Catalog; children?: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: createT(locale, messages, catalog) }), [locale, messages, catalog]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const fallback: Value = { locale: DEFAULT_LOCALE, t: createT(DEFAULT_LOCALE, {}) };

export function useT(): T {
  return (useContext(I18nContext) ?? fallback).t;
}
export function useLocale(): Locale {
  return (useContext(I18nContext) ?? fallback).locale;
}
/** Prefix an internal href with /en when the page is English. */
export function useLocalizedHref() {
  const locale = useLocale();
  return (href: string) => localizePath(href, locale);
}
/** Current pathname without the /en prefix (for active-link checks). */
export function useBarePathname() {
  return stripLocale(usePathname() ?? "/").pathname;
}
/** next/navigation useRouter() whose push/replace/prefetch keep the visitor's language. */
export function useRouter() {
  const router = useNextRouter();
  const locale = useLocale();
  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localizePath(href, locale), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(localizePath(href, locale), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(localizePath(href, locale), options),
  }), [router, locale]);
}
