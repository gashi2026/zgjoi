import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "./config";
import type { MessageKey } from "./messages/sq";

export type Params = Record<string, string | number | null | undefined>;
export type Dictionary = Partial<Record<MessageKey, string>> & Record<string, string>;
/** Albanian source string → English, for text produced by shared/server code. */
export type Catalog = ReadonlyArray<readonly [string, string]>;

export type T = ((key: MessageKey, params?: Params) => string) & {
  locale: Locale;
  /** Translate Albanian text that came from domain code or the database (labels, notices, API messages). */
  tx: (text: string | null | undefined) => string;
  /** A message key (e.g. thrown by a helper) or Albanian/free text from elsewhere. */
  any: (keyOrText: string | null | undefined) => string;
};

const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(template: string, params: Params | undefined, mapValue: (v: string) => string = (v) => v) {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) return "";
    return typeof value === "number" ? String(value) : mapValue(value);
  });
}

type Compiled = { exact: Map<string, string>; patterns: { re: RegExp; names: string[]; en: string }[] };
const compiledCache = new WeakMap<Catalog, Compiled>();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compile(catalog: Catalog): Compiled {
  const cached = compiledCache.get(catalog);
  if (cached) return cached;
  const exact = new Map<string, string>();
  const patterns: Compiled["patterns"] = [];
  for (const [sq, en] of catalog) {
    if (!sq || sq === en) continue;
    if (!/\{\w+\}/.test(sq)) {
      if (!exact.has(sq)) exact.set(sq, en);
      continue;
    }
    const names: string[] = [];
    let source = "";
    let last = 0;
    for (const m of sq.matchAll(PLACEHOLDER)) {
      source += escape(sq.slice(last, m.index)) + "([\\s\\S]*?)";
      names.push(m[1]);
      last = (m.index ?? 0) + m[0].length;
    }
    source += escape(sq.slice(last));
    // A template needs real literal text around its placeholders to be matched safely.
    if (sq.replace(PLACEHOLDER, "").replace(/[\s·:,.()–—-]/g, "").length < 3) continue;
    patterns.push({ re: new RegExp(`^${source}$`), names, en });
  }
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
  const result = { exact, patterns };
  compiledCache.set(catalog, result);
  return result;
}

const SQ_MONEY = /^([−-])?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?\s?€$/;
/** "1.234,50 €" (sq-XK) → "€1,234.50" (en). */
function reformatValue(value: string, locale: Locale) {
  const m = SQ_MONEY.exec(value.trim());
  if (!m) return null;
  const cents = Number(m[2].replace(/\./g, "")) * 100 + Number((m[3] ?? "0").padEnd(2, "0"));
  return (m[1] ? "−" : "") + formatMoney(cents, locale);
}

export function makeTx(locale: Locale, catalog: Catalog) {
  if (locale === DEFAULT_LOCALE) return (text: string | null | undefined) => text ?? "";
  const { exact, patterns } = compile(catalog);
  const tx = (text: string | null | undefined, depth = 0): string => {
    if (!text) return text ?? "";
    // Keep surrounding whitespace (e.g. " " + sentence used as a suffix).
    const core = text.trim();
    if (core !== text) {
      if (!core) return text;
      const lead = text.slice(0, text.indexOf(core));
      return lead + tx(core, depth) + text.slice(lead.length + core.length);
    }
    const hit = exact.get(text);
    if (hit !== undefined) return hit;
    const money = reformatValue(text, locale);
    if (money) return money;
    if (depth > 2) return text;
    for (const p of patterns) {
      const m = p.re.exec(text);
      if (!m) continue;
      const params: Params = {};
      p.names.forEach((name, i) => (params[name] = tx(m[i + 1], depth + 1)));
      return interpolate(p.en, params);
    }
    // Composite labels joined with " · " (e.g. "Rezervo tani · Pastrim") or lists joined with "; ".
    for (const separator of [" · ", "; "]) {
      if (!text.includes(separator)) continue;
      const parts = text.split(separator);
      const translated = parts.map((part) => tx(part, depth + 1));
      if (translated.some((part, i) => part !== parts[i])) return translated.join(separator);
    }
    return text;
  };
  return (text: string | null | undefined) => tx(text);
}

export function createT(locale: Locale, dictionary: Dictionary, catalog: Catalog = []): T {
  const tx = makeTx(locale, catalog);
  const t = ((key: MessageKey, params?: Params) => {
    const template = dictionary[key];
    if (template === undefined) {
      if (process.env.NODE_ENV !== "production") console.warn(`[i18n] missing ${locale} message: ${key}`);
      return key;
    }
    return interpolate(template, params, tx);
  }) as T;
  t.locale = locale;
  t.tx = tx;
  t.any = (value) => (value && dictionary[value] !== undefined ? dictionary[value] : tx(value));
  return t;
}

/* ------------------------------------------------------------ formatting */
// Every date and time on Zgjoi is shown in Kosovo time (Europe/Belgrade zone).
const ZONE = "Europe/Belgrade";

export const formatMoney = (cents: number, locale: Locale = DEFAULT_LOCALE) =>
  new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency: "EUR" }).format(cents / 100);

export const formatDateTime = (value: Date | string, locale: Locale = DEFAULT_LOCALE) =>
  new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
    timeZone: ZONE,
  }).format(new Date(value));

export const formatDate = (value: Date | string, locale: Locale = DEFAULT_LOCALE) =>
  new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium", timeZone: ZONE }).format(new Date(value));

/** Kosovo wall-clock time, 24-hour: "16:45" in both languages. */
export const formatClock = (value: Date | string, locale: Locale = DEFAULT_LOCALE) =>
  new Intl.DateTimeFormat(locale === "sq" ? "sq-AL" : INTL_LOCALE[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ZONE,
  }).format(new Date(value));

/** Mark a message key stored in a constant; translate it at render with t(key). */
export const msgKey = <K extends MessageKey>(key: K) => key;
