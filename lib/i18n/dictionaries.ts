import { en } from "./messages/en";
import { sq, type MessageKey } from "./messages/sq";
import type { Locale } from "./config";
import { createT, makeTx, type Catalog, type Dictionary, type T } from "./translate";

export const dictionaries: Record<Locale, Record<MessageKey, string>> = { sq, en };

/** Keys whose Albanian text is produced by shared/server code (labels, API errors, notifications). */
const isCatalogKey = (key: string) => /^(lib|server|category|categoryGroup)\./.test(key);

let fullCatalog: Catalog | null = null;
/** Every Albanian → English pair; used server-side to translate domain text at the boundary. */
export function catalog(): Catalog {
  fullCatalog ??= (Object.keys(sq) as MessageKey[]).map((k) => [sq[k], en[k]] as const);
  return fullCatalog;
}

/** Albanian → English pairs that client components may need (labels from shared code and stored titles). */
export function clientCatalog(locale: Locale): Catalog {
  if (locale === "sq") return [];
  return (Object.keys(sq) as MessageKey[]).filter(isCatalogKey).map((k) => [sq[k], en[k]] as const);
}

/** UI messages for client components only (server components translate on the server). */
export function clientDictionary(locale: Locale, namespaces: readonly string[]): Dictionary {
  const source = dictionaries[locale];
  const prefixes = namespaces.map((ns) => `${ns}.`);
  const out: Dictionary = {};
  for (const key of Object.keys(source) as MessageKey[])
    if (prefixes.some((p) => key.startsWith(p))) out[key] = source[key];
  return out;
}

/** A translator for an explicit locale (emails, notifications, background jobs). */
export const tFor = (locale: Locale): T => createT(locale, dictionaries[locale], catalog());

/** Translate Albanian domain text (API messages, stored notification titles) into a locale. */
export const translateText = (text: string, locale: Locale) => makeTx(locale, catalog())(text);
