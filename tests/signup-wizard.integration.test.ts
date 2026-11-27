import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/server/db";
import { hashPassword, nextPathFor, SIGNUP_ID_PATH } from "../lib/server/auth";
import { signup } from "../lib/server/accounts";
import { submitIdVerification } from "../lib/server/id-verification";
import { saveProfessions, resolveProCategory } from "../lib/server/pro-categories";
import { adminCommand } from "../lib/server/admin";
import { createInquiry } from "../lib/server/marketplace";
import { searchPros, publicProfile } from "../lib/server/catalog";

const database = new URL(process.env.DATABASE_URL || "");
assert(process.env.CI && ["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname === "/zgjoi_test", "Refuse non-disposable database");
after(async () => { await db.$disconnect(); });

function png(width: number, height: number, fill: number) {
  const b = Buffer.alloc(96, fill);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write("IHDR", 12, "ascii"); b.writeUInt32BE(width, 16); b.writeUInt32BE(height, 20);
  return b;
}
const file = (bytes: Buffer) => new File([new Uint8Array(bytes)], "id.png", { type: "image/png" });
const select = { id: true, email: true, name: true, role: true, city: true, suspendedAt: true, emailVerified: true, signupStep: true,
  proProfile: { select: { id: true, slug: true, verification: true } } } as const;
const actorOf = (id: string) => db.user.findUniqueOrThrow({ where: { id }, select });
const code = (c: string) => (e: { code?: string }) => e.code === c;
const password = `Test-Only-${randomUUID()}`;
const input = (role: "CLIENT" | "PRO", extra: Record<string, unknown> = {}) => ({
  role, name: `Wizard ${role}`, email: `wizard-${role.toLowerCase()}-${randomUUID()}@ci.zgjoi.invalid`, password, city: "Prishtinë", terms: true, ...extra });

test("sign-up wizard: ID is a required step, pros pick several professions, no prices at sign-up", async () => {
  const saved = process.env.DOCUMENT_UPLOADS_ENABLED;
  process.env.DOCUMENT_UPLOADS_ENABLED = "true";
  try {
    // Customer: the account is created in the "ID" step and stays there until the photos are sent.
    const c = await signup(input("CLIENT"), `wizard-${randomUUID()}`);
    let client = await actorOf(c.id);
    assert.equal(client.signupStep, "ID");
    assert.equal(nextPathFor(client, true), SIGNUP_ID_PATH);
    await submitIdVerification(client, file(png(900, 600, 1)), file(png(900, 600, 2)));
    client = await actorOf(c.id);
    assert.equal(client.signupStep, null, "sending the ID finishes sign-up");
    assert.equal(nextPathFor(client, true), "/llogaria");
    assert(await db.auditLog.findFirst({ where: { action: "SIGNUP_COMPLETED", target: c.id } }));
    assert.equal((await db.idVerification.findUniqueOrThrow({ where: { userId: c.id } })).status, "PENDING", "manual approval stays as is");

    // Pro: several professions, no price; the old single categorySlug field still works.
    const p = await signup(input("PRO", { categories: ["pastrim", "nane", "pastrim"], about: "Pastrim dhe kujdes për fëmijë, me përvojë dhe referenca.", priceFrom: "30" }), `wizard-${randomUUID()}`);
    let pro = await actorOf(p.id);
    assert.equal(pro.signupStep, "ID");
    const profile = await db.proProfile.findUniqueOrThrow({ where: { id: pro.proProfile!.id }, include: { categories: { orderBy: { position: "asc" } } } });
    assert.deepEqual(profile.categories.map((r) => r.categorySlug), ["pastrim", "dado"]);
    assert.deepEqual(profile.categories.map((r) => r.priceFromCents), [null, null]);
    assert.equal(profile.priceFrom, null);
    assert.equal(profile.categorySlug, "pastrim");
    await assert.rejects(signup(input("PRO", { categories: ["trainer-personal"], about: "Trajner personal me përvojë shumëvjeçare në palestër." }), `wizard-${randomUUID()}`), code("CATEGORY"));
    await assert.rejects(signup(input("PRO", { categories: ["pastrim", "dado", "kopshtar", "moler", "frizer", "grim"], about: "Shumë profesione njëherësh për provën e kufirit." }), `wizard-${randomUUID()}`), code("CATEGORY"));
    const legacy = await signup(input("PRO", { categorySlug: "elektricist", about: "Elektricist me licencë për instalime shtëpiake." }), `wizard-${randomUUID()}`);
    assert.equal(await db.proCategory.count({ where: { profile: { userId: legacy.id }, categorySlug: "elektricist" } }), 1);

    // Prices are set later, per profession, in the profile panel; no price = "ask for a price".
    await saveProfessions(pro, { categories: [{ slug: "pastrim", priceFrom: "15" }, { slug: "dado" }] });
    await submitIdVerification(pro, file(png(900, 600, 3)), file(png(900, 600, 4)));
    pro = await actorOf(p.id);
    assert.equal(pro.signupStep, null);

    // Approve ID + profile: both professions go public; the unpriced one reads as "ask for a price".
    const adminRow = await db.user.create({ data: { email: `wizard-admin-${randomUUID()}@ci.zgjoi.invalid`, passwordHash: await hashPassword(password), name: "Admin", role: "ADMIN" } });
    const admin = await actorOf(adminRow.id);
    await db.idVerification.update({ where: { userId: p.id }, data: { status: "APPROVED", decidedAt: new Date() } });
    await db.idVerification.update({ where: { userId: c.id }, data: { status: "APPROVED", decidedAt: new Date() } });
    await adminCommand(admin, { action: "PRO_APPROVE", id: pro.proProfile!.id, reason: "Synthetic wizard pro checked" });
    const dado = (await searchPros({ kategoria: "dado" })).pros.find((x) => x.id === pro.proProfile!.id);
    assert.equal(dado?.categorySlug, "dado");
    assert.equal(dado?.priceFrom, null);
    assert.equal((await searchPros({ kategoria: "pastrim" })).pros.find((x) => x.id === pro.proProfile!.id)?.priceFrom, 1500);
    assert(!(await searchPros({ kategoria: "pastrim", maxPrice: 10 })).pros.some((x) => x.id === pro.proProfile!.id));
    assert.deepEqual((await publicProfile(pro.proProfile!.slug))?.categories.map((r) => r.categorySlug), ["pastrim", "dado"]);

    // A chat is about the profession the customer picked; an unoffered one falls back to the main profession.
    const chat = await createInquiry(client, { profileId: pro.proProfile!.id, categorySlug: "nane", detail: "Kam nevojë për dado të shtunën pasdite, dy fëmijë.", city: "Prishtinë", clientKey: randomUUID() });
    assert.equal((await db.serviceRequest.findUniqueOrThrow({ where: { id: chat.id } })).categorySlug, "dado");
    assert.equal((await resolveProCategory(db, pro.proProfile!.id, "elektricist")).slug, "pastrim");

    // Adding a profession later keeps the pro visible; the new one waits for the owner.
    await saveProfessions(pro, { categories: [{ slug: "pastrim", priceFrom: "15" }, { slug: "dado" }, { slug: "kopshtar", priceFrom: "25" }] });
    assert.equal((await db.proProfile.findUniqueOrThrow({ where: { id: pro.proProfile!.id } })).verification, "APPROVED");
    assert(!(await searchPros({ kategoria: "kopshtar" })).pros.some((x) => x.id === pro.proProfile!.id));
    assert(await db.notification.findFirst({ where: { userId: admin.id, kind: "PRO_CATEGORY_PENDING" } }));
    await adminCommand(admin, { action: "PRO_APPROVE", id: pro.proProfile!.id, reason: "Synthetic new profession checked" });
    assert((await searchPros({ kategoria: "kopshtar" })).pros.some((x) => x.id === pro.proProfile!.id));

    // Existing accounts (created before the wizard) are not pulled into it.
    const old = await db.user.create({ data: { email: `wizard-old-${randomUUID()}@ci.zgjoi.invalid`, passwordHash: "x", name: "Old", role: "CLIENT" } });
    assert.equal(nextPathFor(await actorOf(old.id), true), "/llogaria");

    // With uploads switched off sign-up has no ID step at all.
    process.env.DOCUMENT_UPLOADS_ENABLED = "false";
    assert.equal((await actorOf((await signup(input("CLIENT"), `wizard-${randomUUID()}`)).id)).signupStep, null);
  } finally {
    process.env.DOCUMENT_UPLOADS_ENABLED = saved;
  }
});
