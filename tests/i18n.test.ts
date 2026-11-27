import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sq } from "../lib/i18n/messages/sq";
import { en } from "../lib/i18n/messages/en";
import { createT, formatMoney, formatDateTime, formatClock, makeTx } from "../lib/i18n/translate";
import { catalog, translateText } from "../lib/i18n/dictionaries";
import { localizePath, negotiateLocale, stripLocale } from "../lib/i18n/config";
import { scanLeftovers } from "./i18n-scan";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("every message key exists in both Albanian and English", () => {
  const sqKeys = Object.keys(sq);
  const enKeys = Object.keys(en);
  assert.deepEqual(sqKeys.filter((k) => !(k in en)), [], "keys missing from en.ts");
  assert.deepEqual(enKeys.filter((k) => !(k in sq)), [], "keys missing from sq.ts");
});

test("English messages are filled in and keep the same {placeholders}", () => {
  for (const key of Object.keys(sq) as (keyof typeof sq)[]) {
    assert.ok(en[key].trim().length > 0 || sq[key].trim().length === 0, `${key} is empty in English`);
    assert.deepEqual(placeholders(en[key]), placeholders(sq[key]), `${key} placeholders differ`);
  }
});

test("no hard-coded Albanian is left in rendered pages and components", () => {
  // Intentional exceptions: brand/product names only (none at the moment).
  const allowed = new Set<string>([]);
  const leftovers = scanLeftovers().filter((l) => !allowed.has(`${l.file}\t${l.text}`));
  assert.deepEqual(leftovers.map((l) => `${l.file}:${l.line} ${l.text}`), []);
});

test("category names translate through the map; slugs are untouched", () => {
  const map: Record<string, string> = {
    Elektricist: "Electrician", "Mjeshtër i Ujit": "Plumber", Pastrim: "Cleaning", Dado: "Babysitter",
  };
  for (const [name, english] of Object.entries(map)) assert.equal(translateText(name, "en"), english);
  assert.equal(translateText("elektricist", "en"), "elektricist");
  assert.equal(translateText("Elektricist", "sq"), "Elektricist");
});

test("Albanian domain text (errors, composite labels, money) is translated for English", () => {
  const tx = makeTx("en", catalog());
  assert.equal(tx("Email ose fjalëkalim i pasaktë."), en["server.accounts.incorrectEmailPassword"]);
  assert.notEqual(tx("Kontrolloni fushat e formularit."), "Kontrolloni fushat e formularit.");
  assert.equal(tx("1.234,50 €"), "€1,234.50");
  assert.equal(tx("Pastrim · Dado"), "Cleaning · Babysitter");
  assert.equal(tx("Arben Krasniqi"), "Arben Krasniqi", "names and free text pass through");
});

test("t() interpolates and falls back to the key when missing", () => {
  const t = createT("en", { "a.b": "Hello {name}" } as never, catalog());
  assert.equal(t("a.b" as never, { name: "Ana" }), "Hello Ana");
  assert.equal(t("missing.key" as never), "missing.key");
  assert.equal(t.any("a.b"), "Hello {name}");
  assert.equal(t.any("Pastrim"), "Cleaning");
});

test("money, dates and times use each locale in Kosovo time", () => {
  assert.equal(formatMoney(123450, "en"), "€1,234.50");
  assert.match(formatMoney(123450, "sq"), /^1\.?234,50\s€$/);
  // 2026-07-01 14:30 UTC is 16:30 in Kosovo (CEST).
  const summer = new Date("2026-07-01T14:30:00Z");
  assert.equal(formatClock(summer, "en"), "16:30");
  assert.equal(formatClock(summer, "sq"), "16:30");
  assert.match(formatDateTime(summer, "en"), /1 Jul 2026.*16:30/);
  assert.match(formatDateTime(summer, "sq"), /2026.*16:30/);
});

test("English URLs use the /en prefix; Albanian stays unprefixed", () => {
  assert.equal(localizePath("/kerko?q=x", "en"), "/en/kerko?q=x");
  assert.equal(localizePath("/", "en"), "/en");
  assert.equal(localizePath("/en/kerko", "en"), "/en/kerko");
  assert.equal(localizePath("/kerko", "sq"), "/kerko");
  assert.equal(localizePath("/api/locale", "en"), "/api/locale");
  assert.equal(localizePath("https://example.com", "en"), "https://example.com");
  assert.equal(localizePath("/logo.png", "en"), "/logo.png");
  assert.deepEqual(stripLocale("/en/pro/paneli"), { locale: "en", pathname: "/pro/paneli" });
  assert.deepEqual(stripLocale("/en"), { locale: "en", pathname: "/" });
  assert.deepEqual(stripLocale("/english"), { locale: null, pathname: "/english" });
});

test("first visit: English only when the browser prefers English", () => {
  assert.equal(negotiateLocale("en-US,en;q=0.9"), "en");
  assert.equal(negotiateLocale("en-GB"), "en");
  assert.equal(negotiateLocale("sq-AL,sq;q=0.9,en;q=0.8"), "sq");
  assert.equal(negotiateLocale("de-DE,en;q=0.5"), "sq");
  assert.equal(negotiateLocale(null), "sq");
  assert.equal(negotiateLocale(""), "sq");
});

test("User.locale SQL is additive, staging-guarded, and the production copy matches", () => {
  const staging = readFileSync("supabase/staging/user-locale.sql", "utf8");
  const production = readFileSync("supabase/production/20261129_user_locale.sql", "utf8");
  for (const sql of [staging, production]) {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS "locale" TEXT;/);
    assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|DELETE|UPDATE)\b/i);
  }
  assert.match(staging, /_staging_environment' AND value->>'kind' = 'staging'/);
  assert.match(production, /This is the production rollout/);
  assert.match(readFileSync("prisma/schema.prisma", "utf8"), /locale\s+String\?/);
});

test("hours labels use a decimal point in English and keep the comma in Albanian", async () => {
  const { hoursLabel } = await import("../lib/book-now");
  const en = makeTx("en", catalog());
  assert.equal(hoursLabel(150), "2,5 orë");
  assert.equal(en(hoursLabel(150)), "2.5 hr");
  assert.equal(en(hoursLabel(120)), "2 hr");
  assert.equal(makeTx("sq", catalog())(hoursLabel(150)), "2,5 orë");
  assert.equal(en("15,00 €"), "€15.00", "money keeps its own formatting");
  const frame = readFileSync("components/marketplace/Frame.tsx", "utf8");
  assert.doesNotMatch(frame, /href="\/siguria"/, "no stray security link above account pages");
  assert.match(readFileSync("lib/nav.ts", "utf8"), /href: "\/siguria"/, "account security stays reachable from the menu");
});
