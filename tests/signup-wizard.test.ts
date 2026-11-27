import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { signupInput } from "../lib/marketplace-validation";
import { MAX_PRO_CATEGORIES, lowestPrice, normalizeCategorySlugs, offersCategory, pickCategory, publicCategories } from "../lib/pro-categories";
import { nextPathFor, SIGNUP_ID_PATH } from "../lib/server/auth";
import { professionsInput } from "../lib/server/pro-categories";
import { bookingMinimum, hourOptions, validMinMinutes } from "../lib/book-now";

const base = { name: "Arta Krasniqi", email: "arta@example.test", password: "Fjalekalim-i-Forte-2026", city: "Prishtinë", terms: true };
const about = "Pastrim shtëpish dhe zyrash me përvojë tetë-vjeçare, punë e pastër.";
const row = (categorySlug: string, position: number, approved = true, priceFromCents: number | null = null) =>
  ({ categorySlug, position, priceFromCents, approvedAt: approved ? new Date("2026-11-01") : null });

test("pro sign-up takes one or more professions and never a price", () => {
  const pro = signupInput.parse({ ...base, role: "PRO", categories: ["pastrim", "dado"], about, priceFrom: "25" });
  assert.deepEqual(pro.categories, ["pastrim", "dado"]);
  assert.equal("priceFrom" in pro, false, "a price sent by an old client is dropped");
  // Older clients sending a single category still work.
  assert.deepEqual(signupInput.parse({ ...base, role: "PRO", categorySlug: "elektricist", about }).categories, ["elektricist"]);
  const missing = signupInput.safeParse({ ...base, role: "PRO", about });
  assert.equal(missing.success, false);
  assert.ok(!missing.success && missing.error.issues.some((i) => i.path[0] === "categories"));
  // Customers pick no profession and no price.
  assert.deepEqual(signupInput.parse({ ...base, role: "CLIENT" }).categories, []);
  assert.equal(signupInput.safeParse({ ...base, role: "ADMIN" }).success, false);
});

test("profession lists are canonical, de-duplicated and catalogue-only", () => {
  assert.deepEqual(normalizeCategorySlugs(["hidraulik", "mjeshter-i-ujit", "trainer-personal", "nane", " pastrim "]), ["mjeshter-i-ujit", "dado", "pastrim"]);
  assert.equal(MAX_PRO_CATEGORIES, 5);
});

test("only approved professions are public, primary first, and pick the asked-for one", () => {
  const rows = [row("dado", 1), row("pastrim", 0, true, 1500), row("elektricist", 2, false, 900)];
  assert.deepEqual(publicCategories(rows).map((r) => r.categorySlug), ["pastrim", "dado"]);
  assert.deepEqual(publicCategories(rows, ["dado"]).map((r) => r.categorySlug), ["dado"], "inactive categories are hidden");
  assert.equal(pickCategory(rows, "nane"), "dado", "an alias picks the canonical profession");
  assert.equal(pickCategory(rows, "elektricist"), "pastrim", "an unapproved profession falls back to the main one");
  assert.equal(pickCategory(rows, null), "pastrim");
  assert.equal(pickCategory([row("pastrim", 0, false)], "pastrim"), null);
  assert.equal(offersCategory(rows, "dado"), true);
  assert.equal(offersCategory(rows, "elektricist"), false);
  assert.equal(offersCategory([row("trainer-personal", 0)], "trainer-personal"), false);
});

test("no price is 'ask for a price'; the summary price is the lowest set", () => {
  assert.equal(lowestPrice([{ priceFromCents: null }, { priceFromCents: null }]), null);
  assert.equal(lowestPrice([{ priceFromCents: 2500 }, { priceFromCents: null }, { priceFromCents: 1800 }]), 1800);
  const parsed = professionsInput.parse({ categories: [{ slug: "pastrim", priceFrom: "" }, { slug: "dado", priceFrom: "12,50" }] });
  assert.deepEqual(parsed.categories.map((c) => c.priceFrom), [undefined, 1250]);
  assert.equal(professionsInput.safeParse({ categories: [] }).success, false);
  assert.equal(professionsInput.safeParse({ categories: [{ slug: "pastrim", priceFrom: "-3" }] }).success, false);
});

test("a new account mid-wizard always resumes at the ID step; existing accounts do not", () => {
  assert.equal(SIGNUP_ID_PATH, "/regjistrohu/identiteti");
  assert.equal(nextPathFor({ role: "CLIENT", signupStep: "ID" }, true), SIGNUP_ID_PATH);
  assert.equal(nextPathFor({ role: "PRO", signupStep: "ID" }, true), SIGNUP_ID_PATH);
  assert.equal(nextPathFor({ role: "PRO", signupStep: null }, true), "/pro/paneli");
  assert.equal(nextPathFor({ role: "CLIENT", signupStep: "ID" }, false), "/llogaria", "with uploads switched off nobody is trapped");
  const guard = readFileSync("lib/server/guard.ts", "utf8");
  assert.match(guard, /signupStep === "ID" && idUploadsAvailable\(\)\) return localRedirect\(SIGNUP_ID_PATH\)/);
  const login = readFileSync("app/api/auth/login/route.ts", "utf8");
  assert.match(login, /nextPathFor\(user, idUploadsAvailable\(\)\)/);
  const upload = readFileSync("lib/server/id-verification.ts", "utf8");
  assert.match(upload, /signupStep: "ID" \}, data: \{ signupStep: null \}/, "sending the ID completes sign-up");
  assert.match(readFileSync("proxy.ts", "utf8"), /"\/regjistrohu\/identiteti"/);
});

test("sign-up pages ask no price and the ID step cannot be skipped", () => {
  for (const file of ["app/regjistrohu/page.tsx", "app/regjistrohu-profesionist/page.tsx", "components/signup/SignupWizard.tsx"])
    assert.doesNotMatch(readFileSync(file, "utf8"), /priceFrom|hourlyRate/, `${file} must not ask for a price`);
  const step = readFileSync("app/regjistrohu/identiteti/page.tsx", "utf8");
  const uploadBranch = step.slice(step.lastIndexOf("return ("));
  assert.match(uploadBranch, /<IdUploadForm/);
  assert.doesNotMatch(uploadBranch, /accountHome|goToDashboard/, "no 'later' link while the ID is missing");
  assert.doesNotMatch(readFileSync("app/verifikimi/page.tsx", "utf8"), /laterGoMyDashboard/);
});

test("pro categories SQL is additive, backfills the old category, and the production copy matches", () => {
  const staging = readFileSync("supabase/staging/pro-categories-signup.sql", "utf8");
  const production = readFileSync("supabase/production/20261130_pro_categories_signup.sql", "utf8");
  const body = (sql: string) => sql.slice(sql.indexOf("SET LOCAL search_path"));
  assert.equal(body(staging), body(production));
  for (const sql of [staging, production]) {
    const code = sql.replace(/--.*$/gm, "").replace(/ON (DELETE|UPDATE) CASCADE/g, "");
    assert.doesNotMatch(code, /\b(TRUNCATE|DELETE|UPDATE|DROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT))\b/i);
    assert.match(sql, /ALTER COLUMN "priceFrom" DROP NOT NULL/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS "signupStep" TEXT/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /INSERT INTO "ProCategory"[\s\S]+FROM "ProProfile" p[\s\S]+ON CONFLICT/);
    assert.match(sql, /WHEN 'hidraulik' THEN 'mjeshter-i-ujit'/);
    assert.match(sql, /ALTER TABLE "ProCategory" ADD COLUMN IF NOT EXISTS "minMinutes" INTEGER/);
    assert.match(sql, /"minMinutes" BETWEEN 30 AND 720 AND "minMinutes" % 30 = 0/);
  }
  assert.match(staging, /_staging_environment' AND value->>'kind' = 'staging'/);
  assert.match(production, /This is the production rollout/);
  assert.match(readFileSync("scripts/prepare-test-db.mjs", "utf8"), /pro-categories-signup\.sql/);
  assert.match(readFileSync("prisma/schema.prisma", "utf8"), /model ProCategory \{[\s\S]+@@unique\(\[profileId, categorySlug\]\)/);
});

test("minimum hours: per profession, optional, half-hour steps, falling back to the pro's Book now default", () => {
  assert.equal(bookingMinimum(180, 120), 180, "the profession's own minimum wins");
  assert.equal(bookingMinimum(null, 120), 120, "no minimum on the profession: the pro's default");
  assert.equal(bookingMinimum(null, null), null);
  assert.equal(bookingMinimum(45, 60), 60, "an invalid stored value is ignored");
  assert.equal(validMinMinutes(30), true);
  assert.equal(validMinMinutes(720), true);
  assert.equal(validMinMinutes(750), false);
  assert.equal(validMinMinutes(0), false);
  assert.equal(hourOptions(180)[0], 180, "the booking duration list starts at the minimum");
  const parsed = professionsInput.parse({ categories: [{ slug: "pastrim", minMinutes: "180" }, { slug: "dado", minMinutes: "" }, { slug: "kopshtar" }] });
  assert.deepEqual(parsed.categories.map((c) => c.minMinutes), [180, undefined, undefined]);
  assert.equal(professionsInput.safeParse({ categories: [{ slug: "pastrim", minMinutes: "45" }] }).success, false);
  assert.equal(professionsInput.safeParse({ categories: [{ slug: "pastrim", minMinutes: "780" }] }).success, false);
  const editor = readFileSync("components/marketplace/ProfileEditor.tsx", "utf8");
  assert.doesNotMatch(editor, /name: "minMinutes"/, "the minimum lives with each profession, not in the Book now rate form");
});
