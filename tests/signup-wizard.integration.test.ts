import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/server/db";
import { hashPassword, nextPathFor, SIGNUP_ID_PATH } from "../lib/server/auth";
import { signup } from "../lib/server/accounts";
import { submitIdVerification } from "../lib/server/id-verification";
import { saveProfessions, resolveProCategory, professionsInput } from "../lib/server/pro-categories";
import { adminCommand } from "../lib/server/admin";
import { createInquiry } from "../lib/server/marketplace";
import { searchPros, publicProfile } from "../lib/server/catalog";
import { createBooking, saveBookingSettings, bookingTermsFor } from "../lib/server/bookings";

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

    // Backward compatibility: a pro with only the old single rate stays bookable at that rate.
    const proActor = await db.user.findUniqueOrThrow({ where: { id: p.id }, include: { proProfile: true } });
    await saveBookingSettings(proActor, { enabled: true, hourlyRate: "12" });
    let row = await db.proProfile.findUniqueOrThrow({ where: { id: pro.proProfile!.id } });
    assert.equal(row.bookingMinMinutes, 120, "a first Book now rate gets the 2 h default minimum");
    assert.equal((await bookingTermsFor(db, row, "pastrim"))?.rateCents, 1200);

    // After approval the pro can change everything at any time, per profession: order, minimum price,
    // hourly rate and minimum hours. Approval is kept; the old single rate is retired once they save.
    await saveProfessions(pro, { categories: [
      { slug: "dado", priceFrom: "9", hourlyRate: "10", minMinutes: "180" },
      { slug: "pastrim", priceFrom: "18", hourlyRate: "15", minMinutes: "60" },
      { slug: "kopshtar", hourlyRate: "11,50", minMinutes: "" }] });
    const after = await db.proProfile.findUniqueOrThrow({ where: { id: pro.proProfile!.id }, include: { categories: { orderBy: { position: "asc" } } } });
    assert.equal(after.verification, "APPROVED");
    assert.deepEqual(after.categories.map((r) => [r.categorySlug, r.priceFromCents, r.hourlyRateCents, r.minMinutes, Boolean(r.approvedAt)]),
      [["dado", 900, 1000, 180, true], ["pastrim", 1800, 1500, 60, true], ["kopshtar", null, 1150, null, true]]);
    assert.deepEqual([after.categorySlug, after.hourlyRateCents, after.bookNowEnabled], ["dado", null, true], "main = first; legacy rate retired; Book now kept");
    assert.deepEqual(await bookingTermsFor(db, after, "dado"), { rateCents: 1000, minMinutes: 180 });
    assert.deepEqual(await bookingTermsFor(db, after, "pastrim"), { rateCents: 1500, minMinutes: 60 });
    assert.equal(await bookingTermsFor(db, after, "kopshtar"), null, "a rate alone does not make a chat-only profession bookable");
    const shown = (await publicProfile(pro.proProfile!.slug))?.categories.find((r) => r.categorySlug === "dado");
    assert.deepEqual([shown?.minMinutes, shown?.hourlyRateCents, shown?.priceFromCents], [180, 1000, 900]);
    const startsAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const book = (categorySlug: string, minutes: number) => createBooking(client, { profileId: pro.proProfile!.id, categorySlug, clientKey: randomUUID(),
      startsAt, minutes, detail: "Pastrim i plotë i banesës me dy dhoma.", city: "Prishtinë" });
    await assert.rejects(book("dado", 120), code("HOURS"), "below this profession's 3 h minimum");
    await assert.rejects(book("pastrim", 30), code("HOURS"));
    const ok = await book("pastrim", 120);
    const booked = await db.booking.findFirstOrThrow({ where: { requestId: ok.id } });
    assert.deepEqual([booked.hourlyRateCents, booked.minMinutes, booked.totalCents], [1500, 60, 3000], "the booked profession's rate × hours");

    // Search cards: the searched profession's rate, else the lowest.
    const card = async (kategoria?: string) => (await searchPros(kategoria ? { kategoria } : {})).pros.find((x) => x.id === after.id)?.displayRateCents;
    assert.equal(await card("pastrim"), 1500);
    assert.equal(await card("kopshtar"), 1150);
    assert.equal(await card(), 1000);

    // Book now switch is separate: off keeps every rate; a profession without a rate is not bookable.
    await saveBookingSettings(proActor, { enabled: false });
    assert.equal(await bookingTermsFor(db, await db.proProfile.findUniqueOrThrow({ where: { id: after.id } }), "pastrim"), null);
    assert.equal((await db.proCategory.findFirstOrThrow({ where: { profileId: after.id, categorySlug: "pastrim" } })).hourlyRateCents, 1500);
    await saveBookingSettings(proActor, { enabled: true });
    await saveProfessions(pro, { categories: [{ slug: "dado", priceFrom: "9", minMinutes: "180" }, { slug: "pastrim", hourlyRate: "16", minMinutes: "60" }, { slug: "kopshtar" }] });
    row = await db.proProfile.findUniqueOrThrow({ where: { id: after.id } });
    assert.equal(await bookingTermsFor(db, row, "dado"), null, "no rate on this profession: chat only");
    assert.equal((await bookingTermsFor(db, row, "pastrim"))?.rateCents, 1600);
    assert.equal(professionsInput.safeParse({ categories: [{ slug: "pastrim", hourlyRate: "0,50" }] }).success, false);

    // Turning Book now on needs a Book now profession with its own rate.
    const other = await db.user.findUniqueOrThrow({ where: { id: legacy.id }, include: { proProfile: true } });
    await saveProfessions(other, { categories: [{ slug: "kopshtar", hourlyRate: "12" }] });
    await assert.rejects(saveBookingSettings(other, { enabled: true }), code("BOOK_NOW_UNAVAILABLE"));
    await saveProfessions(other, { categories: [{ slug: "elektricist" }, { slug: "kopshtar", hourlyRate: "12" }] });
    await assert.rejects(saveBookingSettings(other, { enabled: true }), code("RATE"));
    await saveProfessions(other, { categories: [{ slug: "elektricist", hourlyRate: "20" }, { slug: "kopshtar", hourlyRate: "12" }] });
    await saveBookingSettings(other, { enabled: true });

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
