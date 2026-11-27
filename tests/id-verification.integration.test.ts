import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/server/db";
import { hashPassword } from "../lib/server/auth";
import {
  submitIdVerification, adminDecideId, readIdImage, purgeExpiredIdImages, requireIdApproved, adminIdQueue, idCheckPending,
  setIdReviewPermission, canReviewIds, identityRecordFor, listIdentityRecords,
} from "../lib/server/id-verification";
import { createBooking } from "../lib/server/bookings";
import { requestEstimate } from "../lib/server/estimates";
import { createInquiry, createOffer, acceptOffer } from "../lib/server/marketplace";
import { createRecurringRequest } from "../lib/server/recurring";
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
const file = (bytes: Buffer, type = "image/png", name = "id.png") => new File([new Uint8Array(bytes)], name, { type });
const select = { id: true, email: true, name: true, role: true, city: true, suspendedAt: true, emailVerified: true, signupStep: true,
  proProfile: { select: { id: true, slug: true, verification: true } } } as const;
const actorOf = (id: string) => db.user.findUniqueOrThrow({ where: { id }, select });
const inYears = (n: number) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() + n); return d.toISOString().slice(0, 10); };
const rec = (legalName: string, documentType: "ID_CARD" | "PASSPORT" = "ID_CARD", documentNumber = "12 345-678a") =>
  ({ legalName, birthDate: "1990-04-17", documentType, documentNumber, issuingCountry: "Kosovë", expiresOn: inYears(5) });
const code = (c: string) => (e: { code?: string }) => e.code === c;

test("ID verification: upload, gating, admin decision, re-upload, private viewing and retention", async () => {
  const saved = process.env.DOCUMENT_UPLOADS_ENABLED;
  process.env.DOCUMENT_UPLOADS_ENABLED = "true";
  try {
    const passwordHash = await hashPassword(`test-only-${randomUUID()}`);
    await db.category.upsert({ where: { slug: "kopshtar" }, update: { active: true }, create: { slug: "kopshtar", name: "Kopshtar", icon: "leaf", active: true } });
    const mk = (role: "CLIENT" | "PRO" | "ADMIN" | "SUPPORT", name: string) => db.user.create({ data: {
      id: randomUUID(), email: `idv-${role.toLowerCase()}-${randomUUID()}@ci.zgjoi.invalid`, passwordHash, name, city: "Prishtinë", role, emailVerified: new Date(),
      ...(role === "PRO" ? { proProfile: { create: { slug: `idv-pro-${randomUUID()}`, categorySlug: "kopshtar", about: "Kopshtar me përvojë për testet e verifikimit të identitetit.",
        priceFrom: 2500, serviceCities: ["Prishtinë"], verification: "APPROVED", verifiedAt: new Date(), hourlyRateCents: 2000, bookingMinMinutes: 60,
        categories: { create: [{ categorySlug: "kopshtar", priceFromCents: 2500, approvedAt: new Date() }] } } } } : {}) } });
    const [clientRow, proRow, adminRow, supportRow] = [await mk("CLIENT", "Arta IDV"), await mk("PRO", "Driton IDV"), await mk("ADMIN", "Admin IDV"), await mk("SUPPORT", "Support IDV")];
    const client = await actorOf(clientRow.id), pro = await actorOf(proRow.id), admin = await actorOf(adminRow.id), support = await actorOf(supportRow.id);
    const profileId = pro.proProfile!.id;

    // Existing users without an upload are gated; staff never are.
    assert.equal(await idCheckPending(client), true);
    assert.equal(await idCheckPending(admin), false);
    await requireIdApproved(admin);
    await requireIdApproved(support);
    await assert.rejects(createBooking(client, {}), code("ID_VERIFICATION_REQUIRED"));
    await assert.rejects(requestEstimate(client, {}), code("ID_VERIFICATION_REQUIRED"));
    await assert.rejects(createInquiry(client, {}), code("ID_VERIFICATION_REQUIRED"));
    await assert.rejects(acceptOffer(client, {}), code("ID_VERIFICATION_REQUIRED"));
    await assert.rejects(createRecurringRequest(client, randomUUID(), {}), code("ID_VERIFICATION_REQUIRED"));
    await assert.rejects(createOffer(pro, {}), code("ID_VERIFICATION_REQUIRED"));
    // An approved pro profile whose ID is not verified is hidden from search and its profile page.
    assert(!(await searchPros({ kategoria: "kopshtar" })).pros.some((p: { id: string }) => p.id === profileId));
    assert.equal(await publicProfile(profileId), null);

    // Validation: staff cannot upload; same photo twice, HEIC, tiny photos and wrong MIME are refused.
    await assert.rejects(submitIdVerification(admin, file(png(900, 600, 1)), file(png(900, 600, 2))), code("FORBIDDEN"));
    await assert.rejects(submitIdVerification(client, file(png(900, 600, 1)), file(png(900, 600, 1))), code("SAME_IMAGE"));
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(64)]);
    await assert.rejects(submitIdVerification(client, file(heic, "image/heic", "a.heic"), file(png(900, 600, 2))), code("HEIC"));
    await assert.rejects(submitIdVerification(client, file(png(300, 200, 1)), file(png(900, 600, 2))), code("RESOLUTION"));
    await assert.rejects(submitIdVerification(client, file(png(900, 600, 1), "image/jpeg"), file(png(900, 600, 2))), code("FILE_TYPE"));
    await assert.rejects(submitIdVerification(client, file(Buffer.alloc(2 * 1024 * 1024 + 1, 1)), file(png(900, 600, 2))), code("SIZE"));

    // Upload: stored encrypted, status PENDING, admins notified, audit entry.
    const front = png(1200, 760, 3), back = png(1200, 760, 4);
    const submitted = await submitIdVerification(client, file(front), file(back));
    assert.equal(submitted.status, "PENDING");
    const images = await db.idDocumentImage.findMany({ where: { verificationId: submitted.id } });
    assert.equal(images.length, 2);
    for (const img of images) assert(!Buffer.from(img.dataEnc).includes(Buffer.from("IHDR")), "photo bytes must be encrypted at rest");
    assert(await db.auditLog.findFirst({ where: { action: "ID_SUBMITTED", target: submitted.id, actorId: client.id } }));
    assert(await db.notification.findFirst({ where: { userId: admin.id, kind: "ID_SUBMITTED" } }));
    await assert.rejects(createBooking(client, {}), (e: { code?: string; message?: string }) => e.code === "ID_VERIFICATION_REQUIRED" && /shqyrtim/.test(e.message ?? ""));

    // Queue lists pending oldest first; only ADMIN may see it or the photos (SUPPORT, the owner and the pro may not).
    const proUpload = await submitIdVerification(pro, file(png(1000, 640, 5)), file(png(1000, 640, 6)));
    const queue = await adminIdQueue(admin);
    const order = queue.pending.map((v) => v.id);
    assert(order.indexOf(submitted.id) < order.indexOf(proUpload.id), "oldest first");
    await assert.rejects(adminIdQueue(support as never), code("FORBIDDEN"));
    await assert.rejects(listIdentityRecords(support as never), code("FORBIDDEN"));
    await assert.rejects(identityRecordFor(client as never, client.id, "VIEW"), code("FORBIDDEN"));
    await assert.rejects(readIdImage(support as never, submitted.id, "FRONT"), code("FORBIDDEN"));
    await assert.rejects(readIdImage(client as never, submitted.id, "FRONT"), code("FORBIDDEN"));
    const viewed = await readIdImage(admin, submitted.id, "FRONT");
    assert.deepEqual(Buffer.from(viewed.bytes), front);
    assert(await db.auditLog.findFirst({ where: { action: "ID_IMAGE_VIEWED", target: submitted.id, actorId: admin.id } }));
    await assert.rejects(readIdImage(admin, submitted.id, "SELFIE"), code("NOT_FOUND"));

    // Decline needs a preset reason; OTHER needs free text. The user is notified and can re-upload.
    await assert.rejects(adminDecideId(admin, { id: submitted.id, decision: "DECLINE", reason: "OTHER" }), code("REASON"));
    await assert.rejects(adminDecideId(support as never, { id: submitted.id, decision: "APPROVE", ...rec("X Y") }), code("FORBIDDEN"));
    await adminDecideId(admin, { id: submitted.id, decision: "DECLINE", reason: "BLURRY", note: "Shkronjat nuk lexohen." });
    await assert.rejects(adminDecideId(admin, { id: submitted.id, decision: "APPROVE", ...rec("Klient IDV") }), code("ALREADY_DECIDED"));
    let row = await db.idVerification.findUniqueOrThrow({ where: { id: submitted.id } });
    assert.equal(row.status, "DECLINED");
    assert.equal(row.declineReason, "BLURRY");
    assert.equal(Math.round((row.purgeAfter!.getTime() - row.decidedAt!.getTime()) / 86_400_000), 30);
    assert(await db.notification.findFirst({ where: { userId: client.id, kind: "ID_DECLINED", href: "/verifikimi" } }));
    assert(await db.auditLog.findFirst({ where: { action: "ID_DECLINED", target: submitted.id, actorId: admin.id } }));
    await assert.rejects(createBooking(client, {}), (e: { message?: string }) => /refuzua/.test(e.message ?? ""));

    const again = await submitIdVerification(client, file(png(1300, 820, 7)), file(png(1300, 820, 8)));
    assert.equal(again.id, submitted.id);
    row = await db.idVerification.findUniqueOrThrow({ where: { id: submitted.id } });
    assert.equal(row.status, "PENDING");
    assert.equal(row.attempts, 2);
    assert.equal(row.declineReason, null);
    assert.equal(row.purgeAfter, null);
    assert(await db.auditLog.findFirst({ where: { action: "ID_IMAGES_DELETED", target: submitted.id, meta: { path: ["reason"], equals: "REPLACED_AFTER_DECLINE" } } }));

    // Approval unlocks booking paths (the next error is ordinary validation, not the ID gate) and shows the pro.
    // Approval requires the identity record fields, validated: real dates, adult, not expired.
    await assert.rejects(adminDecideId(admin, { id: submitted.id, decision: "APPROVE" } as never), (e: { name?: string }) => e.name === "ZodError");
    await assert.rejects(adminDecideId(admin, { id: submitted.id, decision: "APPROVE", ...rec("Klient IDV"), birthDate: "1990-02-30" }), code("BIRTH_DATE"));
    await assert.rejects(adminDecideId(admin, { id: submitted.id, decision: "APPROVE", ...rec("Klient IDV"), birthDate: inYears(-16) }), code("UNDERAGE"));
    await assert.rejects(adminDecideId(admin, { id: submitted.id, decision: "APPROVE", ...rec("Klient IDV"), expiresOn: "2020-01-01" }), code("EXPIRED"));
    assert.equal((await db.idVerification.findUniqueOrThrow({ where: { id: submitted.id } })).status, "PENDING");
    assert.equal(await db.identityRecord.count({ where: { userId: client.id } }), 0);
    await adminDecideId(admin, { id: submitted.id, decision: "APPROVE", ...rec("Klient Idv Testi") });
    await adminDecideId(admin, { id: proUpload.id, decision: "APPROVE", ...rec("Pro Idv Testi", "ID_CARD", "P9988776") });
    // The record is stored with DOB and document number encrypted (no plaintext in the table or the audit log).
    const stored = await db.identityRecord.findUniqueOrThrow({ where: { userId: client.id } });
    assert.equal(stored.legalName, "Klient Idv Testi");
    assert.equal(stored.documentNoLast4, "678A");
    assert.equal(stored.verifiedById, admin.id);
    assert(!stored.documentNoEnc.includes("12345678A") && !stored.birthDateEnc.includes("1990"));
    const createdAudit = await db.auditLog.findFirstOrThrow({ where: { action: "ID_RECORD_CREATED", target: client.id } });
    assert(!JSON.stringify(createdAudit.meta).includes("12345678A") && !JSON.stringify(createdAudit.meta).includes("1990-04-17"));
    await assert.rejects(submitIdVerification(client, file(png(900, 600, 9)), file(png(900, 600, 10))), code("ALREADY_APPROVED"));
    await requireIdApproved(await actorOf(client.id));
    await assert.rejects(createBooking(client, {}), (e: { code?: string }) => e.code !== "ID_VERIFICATION_REQUIRED");
    assert((await searchPros({ kategoria: "kopshtar" })).pros.some((p: { id: string }) => p.id === profileId));
    assert(await publicProfile(profileId));
    row = await db.idVerification.findUniqueOrThrow({ where: { id: submitted.id } });
    assert.equal(Math.round((row.purgeAfter!.getTime() - row.decidedAt!.getTime()) / 86_400_000), 30);

    // Only ID card or passport. An ID card needs both sides; a passport needs only the photo page.
    const traveller = await actorOf((await mk("CLIENT", "Pasaporta IDV")).id);
    await assert.rejects(submitIdVerification(traveller, file(png(1000, 700, 11)), null, "ID_CARD"), code("FILE"));
    const passport = await submitIdVerification(traveller, file(png(1000, 700, 11)), null, "PASSPORT");
    const passportRow = await db.idVerification.findUniqueOrThrow({ where: { id: passport.id }, include: { images: true } });
    assert.equal(passportRow.documentType, "PASSPORT");
    assert.deepEqual(passportRow.images.map((i) => i.side), ["FRONT"]);
    assert.equal((await adminIdQueue(admin)).pending.find((v) => v.id === passport.id)?.documentType, "PASSPORT");

    // SUPPORT has no access by default. The owner grants it per person; it works at once and is audited; revoking works at once.
    assert.equal(await canReviewIds(support), false);
    await assert.rejects(setIdReviewPermission(support as never, { userId: support.id, grant: true }), code("FORBIDDEN"));
    await assert.rejects(setIdReviewPermission(admin, { userId: client.id, grant: true }), code("NOT_FOUND"));
    await setIdReviewPermission(admin, { userId: support.id, grant: true });
    assert(await db.auditLog.findFirst({ where: { action: "ID_REVIEW_GRANTED", target: support.id, actorId: admin.id } }));
    assert.equal(await canReviewIds(support), true);
    assert((await adminIdQueue(support as never)).pending.some((v) => v.id === passport.id));
    await readIdImage(support as never, passport.id, "FRONT");
    assert(await db.auditLog.findFirst({ where: { action: "ID_IMAGE_VIEWED", target: passport.id, actorId: support.id, meta: { path: ["byRole"], equals: "SUPPORT" } } }));
    await adminDecideId(support as never, { id: passport.id, decision: "APPROVE", ...rec("Udhëtar Idv", "PASSPORT", "PA1234567") });
    assert(await db.auditLog.findFirst({ where: { action: "ID_APPROVED", target: passport.id, actorId: support.id } }));
    // Granted support can open and export a record; both are audited.
    const viewedRec = await identityRecordFor(support as never, traveller.id, "VIEW");
    assert.equal(viewedRec.record?.documentNumber, "PA1234567");
    assert.equal(viewedRec.record?.birthDate, "1990-04-17");
    assert.equal(viewedRec.record?.documentType, "PASSPORT");
    assert(viewedRec.history.some((h) => h.action === "ID_APPROVED") && viewedRec.history.some((h) => h.action === "ID_SUBMITTED"));
    assert(await db.auditLog.findFirst({ where: { action: "ID_RECORD_VIEWED", target: traveller.id, actorId: support.id } }));
    await identityRecordFor(admin, traveller.id, "EXPORT");
    assert(await db.auditLog.findFirst({ where: { action: "ID_RECORD_EXPORTED", target: traveller.id, actorId: admin.id } }));
    assert((await listIdentityRecords(support as never, "1234567")).some((r) => r.userId === traveller.id));
    assert((await listIdentityRecords(admin, "udhëtar")).some((r) => r.userId === traveller.id));
    await setIdReviewPermission(admin, { userId: support.id, grant: false });
    assert(await db.auditLog.findFirst({ where: { action: "ID_REVIEW_REVOKED", target: support.id, actorId: admin.id } }));
    await assert.rejects(readIdImage(support as never, passport.id, "FRONT"), code("FORBIDDEN"));
    await assert.rejects(adminIdQueue(support as never), code("FORBIDDEN"));
    await assert.rejects(identityRecordFor(support as never, traveller.id, "VIEW"), code("FORBIDDEN"));
    await assert.rejects(listIdentityRecords(support as never), code("FORBIDDEN"));
    await assert.rejects(identityRecordFor(client as never, traveller.id, "EXPORT"), code("FORBIDDEN"));

    // Retention: nothing is deleted early; 30 days after the decision the photos go, the decision and the identity record stay.
    assert.equal((await purgeExpiredIdImages(new Date(Date.now() + 29 * 86_400_000))).idImagesDeleted, 0);
    const purged = await purgeExpiredIdImages(new Date(Date.now() + 31 * 86_400_000));
    assert(purged.idImagesDeleted >= 4);
    assert.equal(await db.idDocumentImage.count({ where: { verificationId: { in: [submitted.id, proUpload.id] } } }), 0);
    row = await db.idVerification.findUniqueOrThrow({ where: { id: submitted.id } });
    assert.equal(row.status, "APPROVED");
    assert(row.imagesDeletedAt);
    assert(await db.auditLog.findFirst({ where: { action: "ID_IMAGES_DELETED", target: submitted.id, actorId: null, meta: { path: ["reason"], equals: "RETENTION" } } }));
    await assert.rejects(readIdImage(admin, submitted.id, "FRONT"), code("NOT_FOUND"));
    await requireIdApproved(await actorOf(client.id));
    assert.equal(await db.identityRecord.count({ where: { userId: { in: [client.id, traveller.id] } } }), 2);
    assert.equal((await identityRecordFor(admin, client.id, "VIEW")).record?.documentNumber, "12345678A");
    await assert.rejects(db.user.delete({ where: { id: client.id } }));

    // Switch off: nothing is enforced (a deploy before the owner turns uploads on locks nobody out).
    const fresh = await actorOf((await mk("CLIENT", "Pa ID")).id);
    process.env.DOCUMENT_UPLOADS_ENABLED = "false";
    await requireIdApproved(fresh);
    await assert.rejects(submitIdVerification(fresh, file(png(900, 600, 1)), file(png(900, 600, 2))), code("ID_UPLOADS_UNAVAILABLE"));
  } finally {
    process.env.DOCUMENT_UPLOADS_ENABLED = saved;
  }
});
