import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import type { Actor } from "./auth";
import { AppError, invariant } from "./errors";
import { enforceLimit } from "./rate-limit";
import { encryptBytes, decryptBytes } from "./crypto";
import { notify } from "./notifications";
import { entityId } from "../marketplace-validation";
import {
  ID_DECLINE_REASONS, ID_MAX_IMAGE_BYTES, ID_MIN_EDGE_PX, idPurgeAfter, isHeic, needsIdCheck, readImageInfo,
  type IdSide, type IdStatus,
} from "../id-verification";

/**
 * ID verification is live only when the owner's identity-upload switch is on
 * (DOCUMENT_UPLOADS_ENABLED=true) and ENCRYPTION_KEY can encrypt the photos.
 * While it is off nothing is enforced, so a deployment can never lock users out
 * of a feature they cannot use yet.
 */
export function idUploadsAvailable() {
  return process.env.DOCUMENT_UPLOADS_ENABLED === "true" && /^[a-fA-F0-9]{64}$/.test(process.env.ENCRYPTION_KEY ?? "");
}
export const idVerificationEnforced = idUploadsAvailable;

/** Where-clause for a pro's user who may appear publicly and receive work. */
export function proUserWhere(): Prisma.UserWhereInput {
  return {
    suspendedAt: null,
    role: "PRO",
    ...(idVerificationEnforced() ? { idVerification: { is: { status: "APPROVED" } } } : {}),
  };
}

type Reader = Pick<Prisma.TransactionClient, "idVerification">;

export async function idStatusFor(userId: string, tx: Reader = db) {
  return tx.idVerification.findUnique({
    where: { userId },
    select: { status: true, submittedAt: true, decidedAt: true, declineReason: true, declineNote: true, attempts: true, imagesDeletedAt: true },
  });
}

/** True when this account still has to upload / wait for the ID check. */
export async function idCheckPending(actor: Pick<Actor, "id" | "role">, tx: Reader = db) {
  if (!idVerificationEnforced() || !needsIdCheck(actor.role)) return false;
  return (await idStatusFor(actor.id, tx))?.status !== "APPROVED";
}

export function idRequiredMessage(role: string, status: IdStatus | null | undefined) {
  const what = role === "PRO" ? "të pranoni punë dhe të shfaqeni në kërkim" : "të rezervoni ose të punësoni një profesionist";
  if (status === "PENDING") return `Dokumenti juaj i identifikimit është në shqyrtim. Do të mund ${what} sapo të miratohet.`;
  if (status === "DECLINED") return `Verifikimi i identitetit u refuzua. Ngarkoni foto të reja te faqja «Verifikimi» për të mundur ${what}.`;
  return `Për ${what}, ngarkoni foton e letërnjoftimit (para dhe mbrapa) te faqja «Verifikimi».`;
}

/** Throws ID_VERIFICATION_REQUIRED for a customer/pro whose ID is not approved. Staff pass. */
export async function requireIdApproved(actor: Pick<Actor, "id" | "role">, tx: Reader = db) {
  if (!idVerificationEnforced() || !needsIdCheck(actor.role)) return;
  const row = await idStatusFor(actor.id, tx);
  if (row?.status === "APPROVED") return;
  throw new AppError("ID_VERIFICATION_REQUIRED", 403, idRequiredMessage(actor.role, row?.status as IdStatus | undefined));
}

/* ------------------------------------------------------------- upload */

async function readSide(file: unknown, label: string) {
  invariant(file instanceof File && file.size > 0, "FILE", 400, `Zgjidhni foton: ${label}.`);
  invariant(file.size <= ID_MAX_IMAGE_BYTES, "SIZE", 413, `Fotoja (${label}) duhet të jetë deri në 2 MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  invariant(!isHeic(bytes), "HEIC", 415,
    "Fotot HEIC nuk lexohen në këtë shfletues. Bëni foto direkt me kamerë, ose në iPhone zgjidhni Cilësimet › Kamera › Formatet › “Më e përputhshme”.");
  const info = readImageInfo(bytes);
  invariant(info && info.type === file.type, "FILE_TYPE", 415, "Lejohen vetëm foto JPEG ose PNG të vlefshme.");
  invariant(Math.min(info.width, info.height) >= ID_MIN_EDGE_PX, "RESOLUTION", 400,
    `Fotoja (${label}) është shumë e vogël. Fotografoni dokumentin më nga afër.`);
  return { bytes, type: info.type, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export async function submitIdVerification(actor: Actor, front: unknown, back: unknown) {
  invariant(needsIdCheck(actor.role), "FORBIDDEN", 403, "Llogaritë e stafit nuk kanë nevojë për verifikim.");
  invariant(idUploadsAvailable(), "ID_UPLOADS_UNAVAILABLE", 503, "Ngarkimi i dokumenteve nuk është ende i disponueshëm.");
  await enforceLimit(`id-upload:${actor.id}`, 12, 3600_000);
  const f = await readSide(front, "ana e përparme"), b = await readSide(back, "ana e pasme");
  invariant(f.sha256 !== b.sha256, "SAME_IMAGE", 400, "Ngarkuat të njëjtën foto dy herë. Fotografoni të dyja anët e dokumentit.");
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public."User" WHERE id = ${actor.id} FOR UPDATE`;
    const existing = await tx.idVerification.findUnique({ where: { userId: actor.id }, include: { images: { select: { id: true } } } });
    invariant(existing?.status !== "APPROVED", "ALREADY_APPROVED", 409, "Identiteti juaj është verifikuar tashmë.");
    const now = new Date();
    const row = existing
      ? await tx.idVerification.update({ where: { id: existing.id }, data: {
          status: "PENDING", decidedAt: null, decidedById: null, declineReason: null, declineNote: null, purgeAfter: null, imagesDeletedAt: null,
          // A re-upload after a decline is a new attempt and goes to the back of the queue; fixing a pending upload keeps its place.
          ...(existing.status === "DECLINED" ? { attempts: { increment: 1 }, submittedAt: now } : {}),
        } })
      : await tx.idVerification.create({ data: { userId: actor.id, status: "PENDING", submittedAt: now } });
    if (existing?.images.length) {
      await tx.idDocumentImage.deleteMany({ where: { verificationId: row.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ID_IMAGES_DELETED", target: row.id,
        meta: { reason: existing.status === "DECLINED" ? "REPLACED_AFTER_DECLINE" : "REPLACED_WHILE_PENDING", count: existing.images.length } } });
    }
    for (const [side, img] of [["FRONT", f], ["BACK", b]] as const)
      await tx.idDocumentImage.create({ data: { verificationId: row.id, side, mimeType: img.type, sizeBytes: img.bytes.length,
        sha256: img.sha256, dataEnc: encryptBytes(img.bytes) } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "ID_SUBMITTED", target: row.id,
      meta: { attempt: row.attempts, role: actor.role } } });
    if (!existing || existing.status === "DECLINED") {
      const admins = await tx.user.findMany({ where: { role: "ADMIN", suspendedAt: null }, select: { id: true } });
      for (const admin of admins) await notify(tx, admin.id, "ID_SUBMITTED", "Një dokument identifikimi pret shqyrtimin tuaj", "/admin/verifikimi");
    }
    return row;
  }, { timeout: 20_000 });
  return { ok: true, id: result.id, status: "PENDING" as const, message: "Faleminderit! Dokumenti u ruajt privatisht dhe është në shqyrtim." };
}

/* --------------------------------------------------------------- admin */

async function requireAdmin(actor: Actor, tx: Pick<Prisma.TransactionClient, "user"> = db) {
  invariant(actor.role === "ADMIN" && await tx.user.findFirst({ where: { id: actor.id, role: "ADMIN", suspendedAt: null } }),
    "FORBIDDEN", 403, "Nuk keni qasje.");
}

export async function adminIdQueue(actor: Actor) {
  await requireAdmin(actor);
  const select = { id: true, status: true, submittedAt: true, attempts: true, decidedAt: true, declineReason: true, declineNote: true, imagesDeletedAt: true, purgeAfter: true,
    user: { select: { id: true, name: true, email: true, role: true, city: true, createdAt: true, proProfile: { select: { categorySlug: true, verification: true } } } },
    images: { select: { side: true, sizeBytes: true } } } satisfies Prisma.IdVerificationSelect;
  const [pending, recent, missing] = await Promise.all([
    db.idVerification.findMany({ where: { status: "PENDING" }, orderBy: { submittedAt: "asc" }, take: 200, select }),
    db.idVerification.findMany({ where: { status: { not: "PENDING" } }, orderBy: { decidedAt: "desc" }, take: 30, select }),
    db.user.count({ where: { role: { in: ["CLIENT", "PRO"] }, suspendedAt: null, idVerification: { is: null } } }),
  ]);
  return { pending, recent, missing };
}

export const idDecisionInput = z.discriminatedUnion("decision", [
  z.object({ id: entityId, decision: z.literal("APPROVE"), note: z.string().trim().max(500).optional() }),
  z.object({ id: entityId, decision: z.literal("DECLINE"),
    reason: z.enum(Object.keys(ID_DECLINE_REASONS) as [keyof typeof ID_DECLINE_REASONS, ...(keyof typeof ID_DECLINE_REASONS)[]]),
    note: z.string().trim().max(500).optional() }),
]);

export async function adminDecideId(actor: Actor, input: unknown) {
  const data = idDecisionInput.parse(input);
  const note = data.note || null;
  if (data.decision === "DECLINE")
    invariant(data.reason !== "OTHER" || (note && note.length >= 5), "REASON", 400, "Shkruani arsyen e refuzimit.");
  await enforceLimit(`id-decision:${actor.id}`, 120, 60_000);
  return db.$transaction(async (tx) => {
    await requireAdmin(actor, tx);
    const row = await tx.idVerification.findUnique({ where: { id: data.id }, include: { images: { select: { side: true } }, user: { select: { id: true, role: true } } } });
    invariant(row, "NOT_FOUND", 404, "Verifikimi nuk u gjet.");
    invariant(row.status === "PENDING", "ALREADY_DECIDED", 409, "Ky dokument është vendosur tashmë.");
    invariant(row.images.length === 2, "IMAGES_MISSING", 409, "Mungojnë fotot e dokumentit.");
    const decidedAt = new Date(), status = data.decision === "APPROVE" ? "APPROVED" : "DECLINED";
    const changed = await tx.idVerification.updateMany({ where: { id: row.id, status: "PENDING" }, data: {
      status, decidedAt, decidedById: actor.id, purgeAfter: idPurgeAfter(status, decidedAt),
      declineReason: data.decision === "DECLINE" ? data.reason : null, declineNote: data.decision === "DECLINE" ? note : null,
    } });
    invariant(changed.count === 1, "ALREADY_DECIDED", 409, "Ky dokument është vendosur tashmë.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: status === "APPROVED" ? "ID_APPROVED" : "ID_DECLINED", target: row.id,
      meta: { userId: row.userId, attempt: row.attempts, ...(data.decision === "DECLINE" ? { reason: data.reason } : {}), ...(note ? { note } : {}) } } });
    await notify(tx, row.userId, status === "APPROVED" ? "ID_APPROVED" : "ID_DECLINED",
      status === "APPROVED" ? "Identiteti juaj u verifikua" : "Verifikimi i identitetit kërkon foto të reja", "/verifikimi");
    return { ok: true, status, message: status === "APPROVED" ? "U miratua." : "U refuzua; përdoruesi u njoftua." };
  });
}

/** Decrypts one ID photo for an administrator. Every view is audited. */
export async function readIdImage(actor: Actor, id: string, side: string) {
  entityId.parse(id);
  invariant(side === "FRONT" || side === "BACK", "NOT_FOUND", 404, "Fotoja nuk u gjet.");
  await requireAdmin(actor);
  await enforceLimit(`id-image:${actor.id}`, 120, 60_000);
  const image = await db.idDocumentImage.findUnique({ where: { verificationId_side: { verificationId: id, side: side as IdSide } } });
  invariant(image, "NOT_FOUND", 404, "Fotoja nuk u gjet ose është fshirë.");
  const bytes = decryptBytes(image.dataEnc);
  invariant(createHash("sha256").update(bytes).digest("hex") === image.sha256, "INTEGRITY", 500, "Fotoja nuk kaloi kontrollin e integritetit.");
  await db.auditLog.create({ data: { actorId: actor.id, action: "ID_IMAGE_VIEWED", target: id, meta: { side } } });
  return { bytes, mimeType: image.mimeType };
}

/* ----------------------------------------------------------- retention */

/** Deletes ID photos whose retention has passed (90 days after approval, 30 after a decline). */
export async function purgeExpiredIdImages(now = new Date(), limit = 200) {
  const due = await db.idVerification.findMany({
    where: { purgeAfter: { lte: now }, imagesDeletedAt: null, status: { in: ["APPROVED", "DECLINED"] } },
    select: { id: true, status: true, userId: true }, take: limit, orderBy: { purgeAfter: "asc" },
  });
  let deleted = 0;
  for (const row of due) {
    await db.$transaction(async (tx) => {
      // Mark first (guarded): a re-upload in between clears purgeAfter, so its fresh photos are never touched.
      const marked = await tx.idVerification.updateMany({ where: { id: row.id, imagesDeletedAt: null, purgeAfter: { lte: now }, status: { in: ["APPROVED", "DECLINED"] } }, data: { imagesDeletedAt: now } });
      if (marked.count) {
        const removed = await tx.idDocumentImage.deleteMany({ where: { verificationId: row.id } });
        deleted += removed.count;
        await tx.auditLog.create({ data: { actorId: null, action: "ID_IMAGES_DELETED", target: row.id,
          meta: { reason: "RETENTION", status: row.status, userId: row.userId, count: removed.count } } });
      }
    });
  }
  return { idImagesDeleted: deleted, idRecordsPurged: due.length };
}
