import test from "node:test";
import assert from "node:assert/strict";
import { activeAccountWhere } from "../lib/suspension";
import { readFileSync } from "node:fs";
import {
  readImageInfo, isHeic, idPurgeAfter, declineText, needsIdCheck, ID_DECLINE_REASONS, asDocumentType, backRequired, sideLabel, ID_DOCUMENT_TYPES,
  ID_RETENTION_DAYS_AFTER_APPROVAL, ID_RETENTION_DAYS_AFTER_DECLINE, ID_MAX_IMAGE_BYTES,
} from "../lib/id-verification";
import { encryptBytes, decryptBytes } from "../lib/server/crypto";
import { idVerificationEnforced, proUserWhere, idRequiredMessage } from "../lib/server/id-verification";

export function fakePng(width: number, height: number, fill = 7) {
  const b = Buffer.alloc(64, fill);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write("IHDR", 12, "ascii"); b.writeUInt32BE(width, 16); b.writeUInt32BE(height, 20);
  return b;
}
export function fakeJpeg(width: number, height: number) {
  // SOI, APP0 (JFIF, 16 bytes), SOF0 with height/width, then filler.
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF\0"), Buffer.alloc(9),
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03]), Buffer.alloc(32, 1)]);
}

test("real image type and size come from the bytes, not the name or MIME", () => {
  assert.deepEqual(readImageInfo(fakePng(800, 500)), { type: "image/png", width: 800, height: 500 });
  assert.deepEqual(readImageInfo(fakeJpeg(1800, 1135)), { type: "image/jpeg", width: 1800, height: 1135 });
  assert.equal(readImageInfo(Buffer.from("%PDF-1.7 hello")), null);
  assert.equal(readImageInfo(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")), null);
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(16)]);
  assert.equal(isHeic(heic), true);
  assert.equal(isHeic(fakeJpeg(900, 600)), false);
  assert.equal(readImageInfo(heic), null);
  assert.equal(ID_MAX_IMAGE_BYTES, 2 * 1024 * 1024);
});

test("retention: photos go 30 days after any decision (constants)", () => {
  const at = new Date("2026-11-26T12:00:00Z");
  assert.equal(ID_RETENTION_DAYS_AFTER_APPROVAL, 30);
  assert.equal(ID_RETENTION_DAYS_AFTER_DECLINE, 30);
  assert.equal(idPurgeAfter("APPROVED", at).toISOString(), "2026-12-26T12:00:00.000Z");
  assert.equal(idPurgeAfter("DECLINED", at).toISOString(), "2026-12-26T12:00:00.000Z");
});

test("decline reasons: Albanian presets plus free text; OTHER shows only the note", () => {
  assert.equal(declineText("BLURRY"), ID_DECLINE_REASONS.BLURRY);
  assert.equal(declineText("EXPIRED", "Skadoi në 2025"), `${ID_DECLINE_REASONS.EXPIRED}. Skadoi në 2025`);
  assert.equal(declineText("OTHER", "Fotoja është e një personi tjetër"), "Fotoja është e një personi tjetër");
  assert(Object.values(ID_DECLINE_REASONS).every((t) => t.length > 5));
});

test("only an ID card (both sides) or a passport (photo page) is accepted; no driving licence anywhere", () => {
  assert.deepEqual([...ID_DOCUMENT_TYPES], ["ID_CARD", "PASSPORT"]);
  assert.equal(backRequired("ID_CARD"), true);
  assert.equal(backRequired("PASSPORT"), false);
  assert.equal(asDocumentType("PASSPORT"), "PASSPORT");
  assert.equal(asDocumentType("DRIVING_LICENCE"), "ID_CARD", "unknown types fall back to the strict ID-card rule");
  assert.equal(sideLabel("PASSPORT", "FRONT"), "Faqja me foto");
  assert.match(sideLabel("PASSPORT", "BACK"), /opsionale/);
  for (const p of ["lib/id-verification.ts", "components/verification/IdUploadForm.tsx", "app/verifikimi/page.tsx", "app/regjistrohu/page.tsx", "app/regjistrohu-profesionist/page.tsx", "lib/server/id-verification.ts"])
    assert(!/patent[ëe] shoferi e vlefshme|letërnjoftim, pasaportë ose patentë/i.test(readFileSync(p, "utf8")), `${p} must not accept a driving licence`);
});

test("SUPPORT reviews IDs only with a per-person grant from ADMIN; granting is ADMIN-only", () => {
  const s = readFileSync("lib/server/id-verification.ts", "utf8");
  assert.match(s, /export async function canReviewIds[\s\S]{0,400}user\.role === "ADMIN" \|\| user\.canReviewIds/);
  assert.match(s, /export async function setIdReviewPermission[\s\S]{0,300}await requireAdmin\(actor, tx\)/);
  assert.match(s, /ID_REVIEW_GRANTED/);
  assert.match(s, /ID_REVIEW_REVOKED/);
  assert.match(readFileSync("app/api/admin/verifikimi/leja/route.ts", "utf8"), /requireRole\("ADMIN"\)/);
});

test("only customers and pros need the ID check; staff never do", () => {
  assert.equal(needsIdCheck("CLIENT"), true);
  assert.equal(needsIdCheck("PRO"), true);
  assert.equal(needsIdCheck("ADMIN"), false);
  assert.equal(needsIdCheck("SUPPORT"), false);
});

test("ID photos are encrypted with AES-256-GCM and tampering is detected", () => {
  const previous = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = "ab".repeat(32);
  try {
    const plain = fakeJpeg(1000, 700);
    const sealed = encryptBytes(plain);
    assert.equal(sealed.length, plain.length + 28);
    assert(!sealed.includes(Buffer.from("JFIF")), "ciphertext must not contain the plaintext");
    assert.deepEqual(decryptBytes(sealed), plain);
    sealed[sealed.length - 1] ^= 1;
    assert.throws(() => decryptBytes(sealed));
  } finally {
    process.env.ENCRYPTION_KEY = previous;
  }
});

test("enforcement follows the owner's identity-upload switch, so a deploy never locks users out", () => {
  const saved = { flag: process.env.DOCUMENT_UPLOADS_ENABLED, key: process.env.ENCRYPTION_KEY };
  try {
    process.env.ENCRYPTION_KEY = "cd".repeat(32);
    process.env.DOCUMENT_UPLOADS_ENABLED = "false";
    assert.equal(idVerificationEnforced(), false);
    const now = new Date("2026-11-27T12:00:00.000Z");
    assert.deepEqual(proUserWhere(now), { role: "PRO", ...activeAccountWhere(now) });
    process.env.DOCUMENT_UPLOADS_ENABLED = "true";
    assert.equal(idVerificationEnforced(), true);
    assert.deepEqual(proUserWhere(now), { role: "PRO", ...activeAccountWhere(now), idVerification: { is: { status: "APPROVED" } } });
    process.env.ENCRYPTION_KEY = "short";
    assert.equal(idVerificationEnforced(), false, "no valid key, no uploads, no enforcement");
  } finally {
    process.env.DOCUMENT_UPLOADS_ENABLED = saved.flag;
    process.env.ENCRYPTION_KEY = saved.key;
  }
  assert.match(idRequiredMessage("PRO", "PENDING"), /shqyrtim/);
  assert.match(idRequiredMessage("CLIENT", undefined), /para dhe mbrapa\) ose pasaportën/);
  assert.match(idRequiredMessage("CLIENT", "PENDING"), /hapni bisedë/);
  assert.match(idRequiredMessage("CLIENT", "DECLINED"), /refuzua/);
});

test("every public pro listing and every booking/hiring entry point goes through the ID gate", () => {
  const src = (p: string) => readFileSync(p, "utf8");
  for (const p of ["lib/server/catalog.ts", "lib/server/bookings.ts", "lib/server/estimates.ts", "lib/server/marketplace.ts",
    "lib/server/recurring-series.ts", "app/sitemap.ts", "components/Stats.tsx", "app/llogaria/te-preferuarit/page.tsx"]) {
    assert(src(p).includes("proUserWhere()"), `${p} must filter pros with proUserWhere()`);
    assert(!/user: \{ suspendedAt: null, role: "PRO" \}/.test(src(p)), `${p} still lists pros without the ID filter`);
  }
  const m = src("lib/server/marketplace.ts");
  for (const fn of ["createInquiry", "createOffer", "acceptOffer"])
    assert.match(m, new RegExp(`export async function ${fn}\\([^)]*\\) \\{\\n  role\\(actor, "(CLIENT|PRO)"\\);\\n  await requireIdApproved\\(actor\\);`), fn);
  assert.match(src("lib/server/bookings.ts"), /createBooking[\s\S]{0,200}await requireIdApproved\(actor\);/);
  assert.match(src("lib/server/estimates.ts"), /requestEstimate[\s\S]{0,200}await requireIdApproved\(actor\);/);
  assert.match(src("lib/server/recurring.ts"), /createRecurringRequest[\s\S]{0,200}await requireIdApproved\(actor\);/);
  assert.match(src("lib/server/recurring-series.ts"), /action === "CONFIRM" \|\| action === "RESUME"\) await requireIdApproved\(actor\)/);
  // The image route is ADMIN-only and never cacheable; no public or signed storage URL exists.
  const route = src("app/api/admin/verifikimi/[id]/[side]/route.ts");
  assert.match(route, /requireRole\("ADMIN", "SUPPORT"\)/);
  assert.match(src("lib/server/id-verification.ts"), /export async function readIdImage[\s\S]{0,300}await requireReviewer\(actor\)/);
  assert.match(route, /private, no-store/);
  assert(!/signedURL|getPublicUrl|public\/zgjoi/.test(src("lib/server/id-verification.ts")));
});

test("SQL: additive only, RLS on both tables, staging and production bodies match", () => {
  const staging = readFileSync("supabase/staging/id-verification.sql", "utf8");
  const production = readFileSync("supabase/production/20261128_id_verification.sql", "utf8");
  const body = (s: string) => s.slice(s.indexOf("SET LOCAL search_path"));
  assert.equal(body(staging), body(production));
  for (const s of [staging, production]) {
    assert(!/\b(DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE\s+"?public)/i.test(body(s)), "must be additive");
    for (const t of ["IdVerification", "IdDocumentImage"]) {
      assert(s.includes(`ALTER TABLE public."${t}" ENABLE ROW LEVEL SECURITY;`));
      assert(s.includes(`REVOKE ALL ON TABLE public."${t}" FROM PUBLIC, anon, authenticated;`));
    }
  }
  assert.match(production, /IF EXISTS \(SELECT 1 FROM public."Setting" WHERE key = '_staging_environment'\)/);
  assert.match(staging, /requires the dedicated staging marker/);
});

test("identity record helpers: real calendar dates, age, normalized document numbers", async () => {
  const { parseCalendarDate, ageOn, normalizeDocumentNo, ID_MIN_AGE_YEARS } = await import("../lib/id-verification");
  assert.equal(parseCalendarDate("2026-02-30"), null);
  assert.equal(parseCalendarDate("26-02-01"), null);
  assert.equal(parseCalendarDate("2024-02-29")?.toISOString(), "2024-02-29T00:00:00.000Z");
  const today = parseCalendarDate("2026-11-26")!;
  assert.equal(ageOn(parseCalendarDate("2008-11-26")!, today), 18);
  assert.equal(ageOn(parseCalendarDate("2008-11-27")!, today), 17);
  assert.equal(ID_MIN_AGE_YEARS, 18);
  assert.equal(normalizeDocumentNo(" 12 345-678a "), "12345678A");
});

test("identity record SQL: RLS on, browser roles revoked, FK restrict, in both staging and production files", () => {
  for (const f of ["supabase/staging/id-verification.sql", "supabase/production/20261128_id_verification.sql"]) {
    const sql = readFileSync(f, "utf8");
    assert.match(sql, /CREATE TABLE "IdentityRecord"/);
    assert.match(sql, /ALTER TABLE public\."IdentityRecord" ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /REVOKE ALL ON TABLE public\."IdentityRecord" FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /"IdentityRecord_userId_fkey".*ON DELETE RESTRICT/);
  }
  const src = readFileSync("lib/server/id-verification.ts", "utf8");
  assert.match(src, /birthDateEnc: encrypt\(data\.birthDate\)/);
  assert.match(src, /documentNoEnc: encrypt\(data\.documentNumber\)/);
  assert.doesNotMatch(src.slice(src.indexOf("purgeExpiredIdImages")), /identityRecord\.(delete|update)/);
});
