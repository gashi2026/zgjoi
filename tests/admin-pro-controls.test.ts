import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inquiryInput, profileInput, signupInput } from "../lib/marketplace-validation";
import {
  KOSOVO_MUNICIPALITIES, MUNICIPALITY_COUNT, filterMunicipalities, foldPlace, municipalityLabel,
  resolveMunicipality,
} from "../lib/kosovo-municipalities";
import { addDays, activeAccountWhere, suspensionIsActive } from "../lib/suspension";
import { endOfKosovoDate, resolveSuspendedUntil } from "../lib/server/suspension";

test("Kosovo has 38 official municipalities and maps common aliases", () => {
  assert.equal(MUNICIPALITY_COUNT, 38);
  assert.equal(new Set(KOSOVO_MUNICIPALITIES.map((m) => m.name)).size, 38);
  assert.equal(resolveMunicipality("Prishtinë"), "Prishtinë");
  assert.equal(resolveMunicipality("  Pristina "), "Prishtinë");
  assert.equal(resolveMunicipality("Peja"), "Pejë");
  assert.equal(resolveMunicipality("Gjakova"), "Gjakovë");
  assert.equal(resolveMunicipality("Mitrovica"), "Mitrovicë e Jugut");
  assert.equal(resolveMunicipality("North Mitrovica"), "Mitrovicë e Veriut");
  assert.equal(resolveMunicipality("Deçan"), "Deçan");
  assert.equal(resolveMunicipality("Obiliq"), "Obiliq");
  assert.equal(resolveMunicipality("Ferizaj"), "Ferizaj");
  assert.equal(resolveMunicipality("trainer-personal"), null);
  assert.equal(resolveMunicipality("New York"), null);
  assert.equal(municipalityLabel("Prishtinë", "en"), "Pristina");
  assert.equal(municipalityLabel("Prishtinë", "sq"), "Prishtinë");
  assert.ok(filterMunicipalities("prisht", "en").some((m) => m.name === "Prishtinë"));
  assert.equal(foldPlace("Fushë-Kosovë"), foldPlace("Fushe Kosove"));
});

test("sign-up, profile and inquiry cities must be a Kosovo municipality", () => {
  const base = { name: "Arta Krasniqi", email: "arta@example.test", password: "Fjalekalim-i-Forte-2026", terms: true, role: "CLIENT" as const };
  assert.equal(signupInput.parse({ ...base, city: "Pristina" }).city, "Prishtinë");
  assert.equal(signupInput.safeParse({ ...base, city: "Paris" }).success, false);
  assert.equal(profileInput.parse({ name: "Arta Krasniqi", city: "Peja", phone: "", serviceCities: ["Prizren", "Pejë", "Peja"] }).city, "Pejë");
  const profile = profileInput.parse({ name: "Arta Krasniqi", city: "Prishtinë", phone: "", serviceCities: ["Prizren", "Peja"] });
  assert.deepEqual(profile.serviceCities, ["Prizren", "Pejë"]);
  assert.equal(inquiryInput.parse({ profileId: "pro_1", detail: "Dy priza në sallon nuk punojnë fare.", city: "Gjilan", clientKey: "11111111-1111-4111-8111-111111111111" }).city, "Gjilan");
  assert.equal(inquiryInput.safeParse({ profileId: "pro_1", detail: "Dy priza në sallon nuk punojnë fare.", city: "London", clientKey: "11111111-1111-4111-8111-111111111111" }).success, false);
});

test("a timed suspension is not active after its end date, a permanent one is, and deleted accounts stay blocked", () => {
  const now = new Date("2026-12-01T12:00:00.000Z");
  assert.equal(suspensionIsActive({ suspendedAt: null }, now), false);
  assert.equal(suspensionIsActive({ suspendedAt: new Date("2026-11-01T00:00:00Z"), suspendedUntil: null }, now), true);
  assert.equal(suspensionIsActive({ suspendedAt: new Date("2026-11-01T00:00:00Z"), suspendedUntil: new Date("2026-12-02T00:00:00Z") }, now), true);
  assert.equal(suspensionIsActive({ suspendedAt: new Date("2026-11-01T00:00:00Z"), suspendedUntil: new Date("2026-12-01T11:00:00Z") }, now), false);
  assert.equal(suspensionIsActive({ suspendedAt: null, deletedAt: now }, now), true);
  const where = activeAccountWhere(now);
  assert.equal(where.deletedAt, null);
  assert.deepEqual(where.OR, [
    { suspendedAt: null },
    { AND: [{ suspendedUntil: { not: null } }, { suspendedUntil: { lte: now } }] },
  ]);
});

test("suspension presets and a Kosovo end date resolve correctly", () => {
  const now = new Date("2026-12-01T10:00:00.000Z");
  assert.equal(resolveSuspendedUntil("permanent", undefined, now), null);
  assert.equal(resolveSuspendedUntil("1d", undefined, now)?.toISOString(), addDays(now, 1).toISOString());
  assert.equal(resolveSuspendedUntil("7d", undefined, now)?.toISOString(), addDays(now, 7).toISOString());
  assert.equal(resolveSuspendedUntil("30d", undefined, now)?.toISOString(), addDays(now, 30).toISOString());
  const until = resolveSuspendedUntil("until", "2026-12-10", now);
  assert.equal(until?.toISOString(), endOfKosovoDate("2026-12-10").toISOString());
  assert.equal(until && until > now, true);
});

test("admin users page exposes profession ticks, timed suspension and typed deletion", () => {
  const page = readFileSync("app/admin/perdoruesit/page.tsx", "utf8");
  assert.match(page, /AdminProfessionsForm/);
  assert.match(page, /AdminSuspendForm/);
  assert.match(page, /AdminDeleteForm/);
  assert.match(page, /type: "municipality"/);
  const admin = readFileSync("lib/server/admin.ts", "utf8");
  assert.match(admin, /USER_SET_PROFESSIONS/);
  assert.match(admin, /USER_DELETE/);
  assert.match(admin, /resolveSuspendedUntil/);
  const erase = readFileSync("lib/server/admin-accounts.ts", "utf8");
  assert.match(erase, /deleteIdPhotosForUser/);
  assert.match(erase, /IdentityRecord/);
  assert.match(erase, /deletedAt: now/);
  const signup = readFileSync("components/signup/SignupWizard.tsx", "utf8");
  assert.match(signup, /MunicipalitySelect/);
  const auth = readFileSync("lib/server/auth.ts", "utf8");
  assert.match(auth, /liftExpiredSuspension/);
  assert.match(auth, /suspensionIsActive/);
});

test("admin pro controls SQL is additive, staging-guarded, and CI applies it to the test database", () => {
  const staging = readFileSync("supabase/staging/admin-pro-controls.sql", "utf8");
  const production = readFileSync("supabase/production/20261201_admin_pro_controls.sql", "utf8");
  assert.match(staging, /ADD COLUMN IF NOT EXISTS "suspendedUntil"/);
  assert.match(staging, /ADD COLUMN IF NOT EXISTS "suspensionReason"/);
  assert.match(staging, /ADD COLUMN IF NOT EXISTS "deletedAt"/);
  assert.doesNotMatch(staging, /DROP COLUMN|DROP TABLE/i);
  assert.match(staging, /_staging_environment' AND value->>'kind' = 'staging'/);
  assert.match(production, /This is the production rollout/);
  assert.match(production, /ADD COLUMN IF NOT EXISTS "deletedAt"/);
  const prepare = readFileSync("scripts/prepare-test-db.mjs", "utf8");
  assert.match(prepare, /supabase\/staging\/admin-pro-controls\.sql/);
});
