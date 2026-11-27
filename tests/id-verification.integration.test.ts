import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/server/db";
import { hashPassword } from "../lib/server/auth";
import {
  submitIdVerification, adminDecideId, readIdImage, purgeExpiredIdImages, requireIdApproved, adminIdQueue, idCheckPending,
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
const select = { id: true, email: true, name: true, role: true, city: true, suspendedAt: true, emailVerified: true,
  proProfile: { select: { id: true, slug: true, verification: true } } } as const;
const actorOf = (id: string) => db.user.findUniqueOrThrow({ where: { id }, select });
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
        priceFrom: 2500, serviceCities: ["Prishtinë"], verification: "APPROVED", verifiedAt: new Date(), hourlyRateCents: 2000, bookingMinMinutes: 60 } } } : {}) } });
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
    await assert.rejects(readIdImage(support as never, submitted.id, "FRONT"), code("FORBIDDEN"));
    await assert.rejects(readIdImage(client as never, submitted.id, "FRONT"), code("FORBIDDEN"));
    const viewed = await readIdImage(admin, submitted.id, "FRONT");
    assert.deepEqual(Buffer.from(viewed.bytes), front);
    assert(await db.auditLog.findFirst({ where: { action: "ID_IMAGE_VIEWED", target: submitted.id, actorId: admin.id } }));
    await assert.rejects(readIdImage(admin, submitted.id, "SELFIE"), code("NOT_FOUND"));

    // Decline needs a preset reason; OTHER needs free text. The user is notified and can re-upload.
    await assert.rejects(adminDecideId(admin, { id: submitted.id, decision: "DECLINE", reason: "OTHER" }), code("REASON"));
    await assert.rejects(adminDecideId(support as never, { id: submitted.id, decision: "APPROVE" }), code("FORBIDDEN"));
    await adminDecideId(admin, { id: submitted.id, decision: "DECLINE", reason: "BLURRY", note: "Shkronjat nuk lexohen." });
    await assert.rejects(adminDecideId(admin, { id: submitted.id, decision: "APPROVE" }), code("ALREADY_DECIDED"));
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
    await adminDecideId(admin, { id: submitted.id, decision: "APPROVE" });
    await adminDecideId(admin, { id: proUpload.id, decision: "APPROVE" });
    await assert.rejects(submitIdVerification(client, file(png(900, 600, 9)), file(png(900, 600, 10))), code("ALREADY_APPROVED"));
    await requireIdApproved(await actorOf(client.id));
    await assert.rejects(createBooking(client, {}), (e: { code?: string }) => e.code !== "ID_VERIFICATION_REQUIRED");
    assert((await searchPros({ kategoria: "kopshtar" })).pros.some((p: { id: string }) => p.id === profileId));
    assert(await publicProfile(profileId));
    row = await db.idVerification.findUniqueOrThrow({ where: { id: submitted.id } });
    assert.equal(Math.round((row.purgeAfter!.getTime() - row.decidedAt!.getTime()) / 86_400_000), 90);

    // Retention: nothing is deleted early; after 90 days the photos go, the decision stays, and the deletion is logged.
    assert.equal((await purgeExpiredIdImages(new Date(Date.now() + 89 * 86_400_000))).idImagesDeleted, 0);
    const purged = await purgeExpiredIdImages(new Date(Date.now() + 91 * 86_400_000));
    assert(purged.idImagesDeleted >= 4);
    assert.equal(await db.idDocumentImage.count({ where: { verificationId: { in: [submitted.id, proUpload.id] } } }), 0);
    row = await db.idVerification.findUniqueOrThrow({ where: { id: submitted.id } });
    assert.equal(row.status, "APPROVED");
    assert(row.imagesDeletedAt);
    assert(await db.auditLog.findFirst({ where: { action: "ID_IMAGES_DELETED", target: submitted.id, actorId: null, meta: { path: ["reason"], equals: "RETENTION" } } }));
    await assert.rejects(readIdImage(admin, submitted.id, "FRONT"), code("NOT_FOUND"));
    await requireIdApproved(await actorOf(client.id));

    // Switch off: nothing is enforced (a deploy before the owner turns uploads on locks nobody out).
    const fresh = await actorOf((await mk("CLIENT", "Pa ID")).id);
    process.env.DOCUMENT_UPLOADS_ENABLED = "false";
    await requireIdApproved(fresh);
    await assert.rejects(submitIdVerification(fresh, file(png(900, 600, 1)), file(png(900, 600, 2))), code("ID_UPLOADS_UNAVAILABLE"));
  } finally {
    process.env.DOCUMENT_UPLOADS_ENABLED = saved;
  }
});
