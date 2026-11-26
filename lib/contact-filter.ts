/**
 * Detects attempts to share off-platform contact details before a booking is
 * funded. Pure and dependency-free so it can be unit tested and reused.
 *
 * Owner rule (Nov 2026): when contact details are found the whole message is
 * rejected (no masking). Ordinary dates, times and prices must pass.
 */

export type ContactMatch =
  | "PHONE"
  | "EMAIL"
  | "LINK"
  | "MESSENGER"
  | "HANDLE";

const DIGIT_WORDS: Record<string, string> = {
  // Albanian (diacritics are removed during normalisation)
  zero: "0", nje: "1", dy: "2", tre: "3", kater: "4", pese: "5",
  gjashte: "6", shtate: "7", tete: "8", nente: "9",
  // English
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9",
};

const MESSENGER =
  /\b(?:whats\s*app|whatsap|watsapp?|watsap|wtsp|vatsap|vacap|viber|vajber|telegram|instagram|insta|facebook|messenger|snapchat|tiktok|skype|imo\s*app)\b|\b(?:ig|fb|tg|wa)\s*[:@]|\b(?:wa|t|m)\.me\b/;

const MAIL_PROVIDER = /\b(?:gmail|googlemail|hotmail|outlook|yahoo|icloud|protonmail|live\.com)\b/;

const TLD =
  "com|net|org|al|info|io|biz|eu|de|ch|uk|co|xyz|app|online|site|shop|store|ly|gl|page|link|tv|fr|us|rs|mk|ks";

const EMAIL_PLAIN = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/;
// "qa at example dot com", "qa [at] example [dot] com", "qa @ example . com"
// A bare "." only counts without surrounding spaces, so "at noon. Then" passes.
const DOT = String.raw`(?:\.|\s*[(\[{]\s*(?:dot|pike|\.)\s*[)\]}]\s*|\s+(?:dot|pike)\s+)`;
const AT = String.raw`(?:\s*@\s*|\s*[(\[{]\s*(?:at|@|et)\s*[)\]}]\s*|\s+(?:at|et)\s+)`;
const EMAIL_OBFUSCATED = new RegExp(
  String.raw`[a-z0-9._%+-]+${AT}[a-z0-9-]+(?:${DOT}[a-z0-9-]+)*?${DOT}(?:${TLD}|me)\b`,
);
// With a literal "@", spaced dots also count: "qa @ example . com".
const EMAIL_SPACED = new RegExp(
  String.raw`[a-z0-9._%+-]+\s*@\s*[a-z0-9-]+(?:\s*\.\s*[a-z0-9-]+)*?\s*\.\s*(?:${TLD}|me)\b`,
);
const LINK = new RegExp(
  String.raw`https?:\/\/|\bwww\s*\.|\b[a-z0-9-]{2,}\.(?:${TLD})\b(?!\.?\d)|\b[a-z0-9-]{2,}${DOT}(?:${TLD})\b(?!\.?\d)`,
);
const HANDLE = /(?:^|[^a-z0-9._%+-])@[a-z0-9_](?:[a-z0-9_.]{1,29})/;

const TIME_WORDS = new Set([
  "ora", "oren", "ores", "nga", "deri", "prej", "ne", "rreth", "pas", "para",
  "at", "from", "until", "till", "to", "by", "around", "after", "before",
]);

export function normalizeForContactCheck(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "");
}

function isDate(token: string) {
  let m = token.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\.?$/);
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]);
    return d >= 1 && d <= 31 && mo >= 1 && mo <= 12;
  }
  m = token.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const mo = Number(m[2]), d = Number(m[3]);
    return d >= 1 && d <= 31 && mo >= 1 && mo <= 12;
  }
  return false;
}

function isClock(token: string) {
  // 10:00, 9:30h, 10:00-12:00
  return token
    .split(/[-–]/)
    .every((part) => /^([01]?\d|2[0-3]):[0-5]\d(?:h)?$/.test(part));
}

function isDotClock(token: string) {
  return /^([01]?\d|2[0-3])\.[0-5]\d(?:h)?$/.test(token);
}

function isPrice(token: string) {
  return /^€?\d{1,3}(?:[.,']\d{3})*(?:[.,]\d{1,2})?€?$|^€?\d+(?:[.,]\d{1,2})?€?$/.test(token);
}

const CURRENCY = /^(?:€|eur|euro|euro\.|euros?)$/;

/** Number tokens that are clearly not phone digits break a phone run. */
function phoneDigits(text: string) {
  const prepared = text
    // split digits glued to letters (tel044…, 044tel) but keep € attached to amounts
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2");
  const tokens = prepared.split(/\s+/).filter(Boolean);
  const words = tokens.map((raw) => raw.replace(/^[^\w+€(]+|[^\w€)]+$/g, ""));
  let run = 0;
  let longest = 0;
  for (let i = 0; i < words.length; i++) {
    let token = words[i];
    if (!token) continue;
    if (DIGIT_WORDS[token]) token = DIGIT_WORDS[token];
    const digits = token.replace(/\D/g, "");
    const numeric = /^[+(]?[\d().\-/:,'€]+[)]?$/.test(token) && digits.length > 0;
    if (!numeric) {
      // pure connectors like "-" or "/" keep the run going; real words break it
      if (!/^[-–/.()+]+$/.test(token)) run = 0;
      continue;
    }
    const previous = words[i - 1] ?? "";
    const next = words[i + 1] ?? "";
    const benign =
      isDate(token) ||
      isClock(token) ||
      (isDotClock(token) && (TIME_WORDS.has(previous) || next === "h" || next.startsWith("min"))) ||
      (isPrice(token) && (token.includes("€") || CURRENCY.test(next) || CURRENCY.test(previous)));
    if (benign) {
      run = 0;
      continue;
    }
    run += digits.length;
    longest = Math.max(longest, run);
  }
  return longest;
}

export function findContactDetails(text: string): ContactMatch | null {
  const value = normalizeForContactCheck(text);
  if (EMAIL_PLAIN.test(value) || EMAIL_SPACED.test(value) || EMAIL_OBFUSCATED.test(value) || MAIL_PROVIDER.test(value))
    return "EMAIL";
  if (LINK.test(value)) return "LINK";
  if (MESSENGER.test(value)) return "MESSENGER";
  if (HANDLE.test(value)) return "HANDLE";
  if (phoneDigits(value) >= 7) return "PHONE";
  return null;
}

export function containsContactDetails(text: string) {
  return findContactDetails(text) !== null;
}
