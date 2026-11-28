import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  categorySlugs, kurseSubjects, professionLabel, professionOptions, professionSlug, sameProfession,
  serviceCategories, serviceCategory, serviceSubject, subjectsOf,
} from "../lib/service-categories";
import { MAX_PRO_CATEGORIES, categoryCount, displayRate, normalizeCategorySlugs, offersCategory, pickCategory, publicCategories } from "../lib/pro-categories";
import { hiringFlow } from "../lib/book-now";
import { commissionRate } from "../lib/commission-policy";
import { approvedHoneycomb } from "../lib/service-categories";
import { DEFAULT_SERVICES } from "../lib/honeycomb-slots";
import { professionsInput } from "../lib/server/pro-categories";
import { sq } from "../lib/i18n/messages/sq";
import { en } from "../lib/i18n/messages/en";

const row = (categorySlug: string, position = 0, approved = true) =>
  ({ categorySlug, position, priceFromCents: null, approvedAt: approved ? new Date("2026-11-01") : null });

test("Valle is no longer a category of its own; Kurse has the subjects", () => {
  assert(!serviceCategories.some((c) => (c.slug as string) === "valle" || (c.name as string) === "Valle"));
  assert.equal(serviceCategories.length, 13);
  assert.equal(subjectsOf("kurse").length, kurseSubjects.length);
  assert.equal(new Set(kurseSubjects.map((s) => s.slug)).size, kurseSubjects.length, "subject slugs are unique");
  for (const s of kurseSubjects) assert(s.slug.startsWith("kurse-") && s.parent === "kurse");
  for (const slug of ["kurse-anglisht", "kurse-matematike", "kurse-balet", "kurse-valle-popullore", "kurse-vallezim", "kurse-patente"])
    assert(kurseSubjects.some((s) => s.slug === slug), slug);
  assert(!Object.values(DEFAULT_SERVICES).includes("valle"), "no honeycomb cell points at Valle");
});

test("old Valle slugs and URLs still work: they resolve to Kurse and a Kurse subject", () => {
  for (const legacy of ["valle", "balet", "vallezim", "vallzim"]) {
    assert.equal(serviceCategory(legacy)?.slug, "kurse", legacy);
    assert.equal(hiringFlow(legacy).bookNow, false);
    assert.equal(commissionRate(legacy, { elite: false, recurring: false }).categorySlug, "kurse");
  }
  assert.equal(professionSlug("valle"), "kurse-valle-popullore");
  assert.equal(professionSlug("balet"), "kurse-balet");
  assert.equal(professionSlug("vallezim"), "kurse-vallezim");
  assert.equal(professionSlug("vallzim"), "kurse-vallezim");
  assert.equal(professionSlug("tutor"), "kurse");
  assert.equal(professionSlug("kurse"), "kurse", "plain Kurse rows stay valid");
  assert.equal(professionSlug("trainer-personal"), undefined);
  // A saved honeycomb cell that still says "valle" becomes Kurse.
  assert.deepEqual(approvedHoneycomb({ "1,1": "valle" }), { "1,1": "kurse" });
});

test("searching Kurse matches every subject and old Valle rows; a subject matches only itself and its legacy slug", () => {
  const all = categorySlugs("kurse");
  for (const slug of ["kurse", "kurse-anglisht", "kurse-balet", "valle", "balet", "vallezim", "tutor"]) assert(all.includes(slug), slug);
  assert.deepEqual(categorySlugs("kurse-balet"), ["kurse-balet", "balet"]);
  assert.deepEqual(categorySlugs("valle"), ["kurse-valle-popullore", "valle"], "?kategoria=valle opens Traditional dance");
  assert.deepEqual(categorySlugs("kurse-anglisht"), ["kurse-anglisht"]);
  assert(!categorySlugs("frizer").some((s) => s.startsWith("kurse")));
  assert.equal(sameProfession("kurse-anglisht", "kurse"), true);
  assert.equal(sameProfession("kurse-anglisht", "kurse-matematike"), false);
  assert.equal(sameProfession("balet", "kurse-balet"), true);
  assert.equal(sameProfession("valle", "kurse-vallezim"), false);
  assert.equal(sameProfession("pastrim", "kurse"), false);
});

test("a pro can offer several subjects; they count as one category", () => {
  assert.deepEqual(normalizeCategorySlugs(["kurse-anglisht", "valle", "kurse-anglisht", "balet", "pastrim"]),
    ["kurse-anglisht", "kurse-valle-popullore", "kurse-balet", "pastrim"]);
  assert.equal(categoryCount(["kurse-anglisht", "kurse-matematike", "kurse-balet", "pastrim"]), 2);
  assert.equal(MAX_PRO_CATEGORIES, 5);
  const rows = [row("kurse-anglisht", 0), row("kurse-matematike", 1), row("pastrim", 2), row("elektricist", 3, false)];
  assert.deepEqual(publicCategories(rows).map((r) => r.categorySlug), ["kurse-anglisht", "kurse-matematike", "pastrim"]);
  assert.equal(pickCategory(rows, "kurse-matematike"), "kurse", "requests and jobs stay on the parent category Kurse");
  assert.equal(offersCategory(rows, "kurse"), true);
  assert.equal(offersCategory(rows, "valle"), true, "Valle-era links still find a Kurse teacher");
  assert.equal(displayRate([{ categorySlug: "kurse-anglisht", hourlyRateCents: 2000 }, { categorySlug: "kurse-matematike", hourlyRateCents: 3000 }], null, "kurse-matematike"), 3000);
  assert.equal(displayRate([{ categorySlug: "kurse-anglisht", hourlyRateCents: 2000 }, { categorySlug: "kurse-matematike", hourlyRateCents: 3000 }], null, null), 2000);
  const parsed = professionsInput.parse({ categories: ["kurse-anglisht", "kurse-matematike", "kurse-balet", "kurse-kendim", "kurse-art", "kurse-italisht"].map((slug) => ({ slug })) });
  assert.equal(parsed.categories.length, 6, "more than five rows are fine when they are one category");
});

test("subjects have Albanian and English names and a readable profession label", () => {
  for (const s of kurseSubjects) {
    const key = Object.keys(sq).find((k) => sq[k as keyof typeof sq] === s.name && k.startsWith("category.kurse"));
    assert(key, `${s.slug} has a message key`);
    assert.ok(en[key as keyof typeof en], `${s.slug} has an English name`);
  }
  assert.equal(professionLabel("kurse-anglisht"), "Kurse · Anglisht");
  assert.equal(professionLabel("valle"), "Kurse · Valle popullore");
  assert.equal(professionLabel("kurse"), "Kurse");
  assert.equal(professionLabel("frizer"), "Frizer");
  const options = professionOptions(serviceCategories.map(({ slug, name, icon }) => ({ slug, name, icon })), (x) => x);
  assert.equal(options.filter((o) => o.group === "Kurse").length, kurseSubjects.length);
  assert.equal(options.find((o) => o.slug === "kurse")?.hidden, true, "plain Kurse is never offered for new picks");
  assert.equal(options.filter((o) => !o.hidden).length, 12 + kurseSubjects.length);
  assert(serviceSubject("kurse-balet") && !serviceSubject("kurse"));
});

test("pickers show Kurse as a dropdown of subjects", () => {
  assert.match(readFileSync("app/kerko/page.tsx", "utf8"), /<optgroup/);
  assert.match(readFileSync("components/marketplace/ProfessionsEditor.tsx", "utf8"), /<optgroup/);
  assert.match(readFileSync("components/Categories.tsx", "utf8"), /<details/);
  assert.match(readFileSync("components/signup/SignupWizard.tsx", "utf8"), /subject-picker-/);
});
