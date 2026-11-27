import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import type { Actor } from "./auth";
import { activeAccountWhere } from "../suspension";
import { AppError, invariant } from "./errors";
import { enforceLimit } from "./rate-limit";
import { encryptBytes, decryptBytes, encrypt, decrypt } from "./crypto";
import { notify } from "./notifications";
import { entityId } from "../marketplace-validation";
import {
  ID_DECLINE_REASONS, ID_MAX_IMAGE_BYTES, ID_MIN_EDGE_PX, idPurgeAfter, isHeic, needsIdCheck, readImageInfo,
  asDocumentType, backRequired, parseCalendarDate, ageOn, normalizeDocumentNo, ID_MIN_AGE_YEARS, ID_DOCUMENT_TYPES,
  type IdSide, type IdStatus, type IdDocumentType,
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
export function proUserWhere(now = new Date()): Prisma.UserWhereInput {
  return {
    role: "PRO",
    ...activeAccountWhere(now),
    ...(idVerificationEnforced() ? { idVerification: { is: { status: "APPROVED" } } } : {}),
  };
}

type Reader = Pick<Prisma.TransactionClient, "idVerification">;

export async function idStatusFor(userId: string, tx: Reader = db) {
  return tx.idVerification.findUnique({
    where: { userId },
    select: { status: true, documentType: true, submittedAt: true, decidedAt: true, declineReason: true, declineNote: true, attempts: true, imagesDeletedAt: true },
  });
}

/** True when this account still has to upload / wait for the ID check. */
export async function idCheckPending(actor: Pick<Actor, "id" | "role">, tx: Reader = db) {
  if (!idVerificationEnforced() || !needsIdCheck(actor.role)) return false;
  return (await idStatusFor(actor.id, tx))?.status !== "APPROVED";
}

/** What an unverified customer can still do (owner: "they can only see who's around"). */
export const CLIENT_BROWSE_ONLY =
  "Deri atëherë mund vetëm të shihni profesionistët përreth: nuk mund të hapni bisedë, të punësoni, të rezervoni, të kërkoni vlerësim ose abonim.";

export function idRequiredMessage(role: string, status: IdStatus | null | undefined) {
  const what = role === "PRO" ? "të pranoni punë dhe të shfaqeni në kërkim" : "të hapni bisedë, të punësoni ose të rezervoni një profesionist";
  if (status === "PENDING") return `Dokumenti juaj i identifikimit është në shqyrtim. Do të mund ${what} sapo të miratohet.`;
  if (status === "DECLINED") return `Verifikimi i identitetit u refuzua. Ngarkoni foto të reja te faqja «Verifikimi» për të mundur ${what}.`;
  return `Për ${what}, ngarkoni letërnjoftimin (para dhe mbrapa) ose pasaportën te faqja «Verifikimi».`;
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

export async function submitIdVerification(actor: Actor, front: unknown, back: unknown, type: unknown = "ID_CARD") {
  const documentType: IdDocumentType = asDocumentType(type);
  invariant(needsIdCheck(actor.role), "FORBIDDEN", 403, "Llogaritë e stafit nuk kanë nevojë për verifikim.");
  invariant(idUploadsAvailable(), "ID_UPLOADS_UNAVAILABLE", 503, "Ngarkimi i dokumenteve nuk është ende i disponueshëm.");
  await enforceLimit(`id-upload:${actor.id}`, 12, 3600_000);
  const hasBack = back instanceof File && back.size > 0;
  invariant(hasBack || !backRequired(documentType), "FILE", 400, "Zgjidhni foton: ana e pasme e letërnjoftimit.");
  const f = await readSide(front, documentType === "PASSPORT" ? "faqja me foto" : "ana e përparme");
  const b = hasBack ? await readSide(back, documentType === "PASSPORT" ? "faqja tjetër" : "ana e pasme") : null;
  invariant(!b || f.sha256 !== b.sha256, "SAME_IMAGE", 400, "Ngarkuat të njëjtën foto dy herë. Fotografoni të dyja anët e dokumentit.");
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public."User" WHERE id = ${actor.id} FOR UPDATE`;
    const existing = await tx.idVerification.findUnique({ where: { userId: actor.id }, include: { images: { select: { id: true } } } });
    invariant(existing?.status !== "APPROVED", "ALREADY_APPROVED", 409, "Identiteti juaj është verifikuar tashmë.");
    const now = new Date();
    const row = existing
      ? await tx.idVerification.update({ where: { id: existing.id }, data: {
          status: "PENDING", documentType, decidedAt: null, decidedById: null, declineReason: null, declineNote: null, purgeAfter: null, imagesDeletedAt: null,
          // A re-upload after a decline is a new attempt and goes to the back of the queue; fixing a pending upload keeps its place.
          ...(existing.status === "DECLINED" ? { attempts: { increment: 1 }, submittedAt: now } : {}),
        } })
      : await tx.idVerification.create({ data: { userId: actor.id, status: "PENDING", documentType, submittedAt: now } });
    if (existing?.images.length) {
      await tx.idDocumentImage.deleteMany({ where: { verificationId: row.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ID_IMAGES_DELETED", target: row.id,
        meta: { reason: existing.status === "DECLINED" ? "REPLACED_AFTER_DECLINE" : "REPLACED_WHILE_PENDING", count: existing.images.length } } });
    }
    for (const [side, img] of [["FRONT", f], ["BACK", b]] as const) if (img)
      await tx.idDocumentImage.create({ data: { verificationId: row.id, side, mimeType: img.type, sizeBytes: img.bytes.length,
        sha256: img.sha256, dataEnc: encryptBytes(img.bytes) } });
    // Uploading the ID is the last step of the sign-up wizard: the account is now complete.
    const finished = await tx.user.updateMany({ where: { id: actor.id, signupStep: "ID" }, data: { signupStep: null } });
    if (finished.count) await tx.auditLog.create({ data: { actorId: actor.id, action: "SIGNUP_COMPLETED", target: actor.id, meta: { role: actor.role } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "ID_SUBMITTED", target: row.id,
      meta: { attempt: row.attempts, role: actor.role, documentType, pages: b ? 2 : 1 } } });
    if (!existing || existing.status === "DECLINED") {
      const admins = await tx.user.findMany({ where: { suspendedAt: null, OR: [{ role: "ADMIN" }, { role: "SUPPORT", canReviewIds: true }] }, select: { id: true } });
      for (const admin of admins) await notify(tx, admin.id, "ID_SUBMITTED", "Një dokument identifikimi pret shqyrtimin tuaj", "/admin/verifikimi");
    }
    return row;
  }, { timeout: 20_000 });
  return { ok: true, id: result.id, status: "PENDING" as const, message: "Faleminderit! Dokumenti u ruajt privatisht dhe është në shqyrtim." };
}

/* --------------------------------------------------------------- admin */

type UserReader = Pick<Prisma.TransactionClient, "user">;

/** ADMIN always; a SUPPORT user only while the owner has granted ID review. Read from the
 * database on every call, so a revocation takes effect on the very next request. */
export async function canReviewIds(actor: Pick<Actor, "id" | "role">, tx: UserReader = db) {
  if (actor.role !== "ADMIN" && actor.role !== "SUPPORT") return false;
  const user = await tx.user.findFirst({ where: { id: actor.id, suspendedAt: null, role: actor.role }, select: { role: true, canReviewIds: true } });
  return !!user && (user.role === "ADMIN" || user.canReviewIds);
}
async function requireReviewer(actor: Actor, tx: UserReader = db) {
  invariant(await canReviewIds(actor, tx), "FORBIDDEN", 403, "Nuk keni qasje në verifikimin e ID-ve.");
}
async function requireAdmin(actor: Actor, tx: UserReader = db) {
  invariant(actor.role === "ADMIN" && await tx.user.findFirst({ where: { id: actor.id, role: "ADMIN", suspendedAt: null } }),
    "FORBIDDEN", 403, "Vetëm administratori mund ta ndryshojë këtë leje.");
}

export async function supportReviewers(actor: Actor) {
  await requireAdmin(actor);
  return db.user.findMany({ where: { role: "SUPPORT" }, orderBy: { name: "asc" }, take: 100,
    select: { id: true, name: true, email: true, canReviewIds: true, suspendedAt: true } });
}

export const reviewPermissionInput = z.object({ userId: entityId, grant: z.boolean() });

/** ADMIN grants or revokes ID review for one SUPPORT user. Audited; immediate. */
export async function setIdReviewPermission(actor: Actor, input: unknown) {
  const { userId, grant } = reviewPermissionInput.parse(input);
  return db.$transaction(async (tx) => {
    await requireAdmin(actor, tx);
    const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, canReviewIds: true } });
    invariant(target && target.role === "SUPPORT", "NOT_FOUND", 404, "Leja jepet vetëm për stafin e mbështetjes.");
    if (target.canReviewIds === grant) return { ok: true, grant, message: "Pa ndryshim." };
    await tx.user.update({ where: { id: userId }, data: { canReviewIds: grant } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: grant ? "ID_REVIEW_GRANTED" : "ID_REVIEW_REVOKED", target: userId } });
    await notify(tx, userId, grant ? "ID_REVIEW_GRANTED" : "ID_REVIEW_REVOKED",
      grant ? "Ju u dha leja për të shqyrtuar dokumentet e identifikimit" : "Leja për dokumentet e identifikimit u hoq", grant ? "/admin/verifikimi" : "/admin/mbeshtetja");
    return { ok: true, grant, message: grant ? "Leja u dha." : "Leja u hoq." };
  });
}

export async function adminIdQueue(actor: Actor) {
  await requireReviewer(actor);
  const select = { id: true, status: true, documentType: true, submittedAt: true, attempts: true, decidedAt: true, declineReason: true, declineNote: true, imagesDeletedAt: true, purgeAfter: true,
    user: { select: { id: true, name: true, email: true, role: true, city: true, createdAt: true, proProfile: { select: { categorySlug: true, verification: true } } } },
    images: { select: { side: true, sizeBytes: true } } } satisfies Prisma.IdVerificationSelect;
  const [pending, recent, missing] = await Promise.all([
    db.idVerification.findMany({ where: { status: "PENDING" }, orderBy: { submittedAt: "asc" }, take: 200, select }),
    db.idVerification.findMany({ where: { status: { not: "PENDING" } }, orderBy: { decidedAt: "desc" }, take: 30, select }),
    db.user.count({ where: { role: { in: ["CLIENT", "PRO"] }, suspendedAt: null, idVerification: { is: null } } }),
  ]);
  return { pending, recent, missing };
}

const calendarDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Data duhet të jetë në formatin VVVV-MM-DD.");
export const idDecisionInput = z.discriminatedUnion("decision", [
  z.object({ id: entityId, decision: z.literal("APPROVE"), note: z.string().trim().max(500).optional(),
    // The permanent identity record, copied by the reviewer from the document. Required to approve.
    legalName: z.string().trim().min(2, "Shkruani emrin dhe mbiemrin si në dokument.").max(120),
    birthDate: calendarDate,
    documentType: z.enum(ID_DOCUMENT_TYPES),
    documentNumber: z.string().trim().max(40).transform(normalizeDocumentNo).pipe(z.string().regex(/^[A-Z0-9]{4,30}$/, "Numri i dokumentit duhet të ketë 4–30 shkronja ose shifra.")),
    issuingCountry: z.string().trim().min(2, "Shkruani shtetin që e ka lëshuar dokumentin.").max(60),
    expiresOn: calendarDate }),
  z.object({ id: entityId, decision: z.literal("DECLINE"),
    reason: z.enum(Object.keys(ID_DECLINE_REASONS) as [keyof typeof ID_DECLINE_REASONS, ...(keyof typeof ID_DECLINE_REASONS)[]]),
    note: z.string().trim().max(500).optional() }),
]);

export async function adminDecideId(actor: Actor, input: unknown) {
  const data = idDecisionInput.parse(input);
  const note = data.note || null;
  if (data.decision === "DECLINE")
    invariant(data.reason !== "OTHER" || (note && note.length >= 5), "REASON", 400, "Shkruani arsyen e refuzimit.");
  let record: { birth: Date; expires: Date } | null = null;
  if (data.decision === "APPROVE") {
    const birth = parseCalendarDate(data.birthDate), expires = parseCalendarDate(data.expiresOn);
    const today = parseCalendarDate(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" }))!;
    invariant(birth && birth < today && ageOn(birth, today) <= 120, "BIRTH_DATE", 400, "Data e lindjes nuk është e vlefshme.");
    invariant(ageOn(birth, today) >= ID_MIN_AGE_YEARS, "UNDERAGE", 400, `Llogaria kërkon moshën ${ID_MIN_AGE_YEARS}+. Refuzojeni dokumentin.`);
    invariant(expires && expires >= today, "EXPIRED", 400, "Dokumenti ka skaduar. Refuzojeni me arsyen “Dokumenti ka skaduar”.");
    record = { birth, expires };
  }
  await enforceLimit(`id-decision:${actor.id}`, 120, 60_000);
  return db.$transaction(async (tx) => {
    await requireReviewer(actor, tx);
    const row = await tx.idVerification.findUnique({ where: { id: data.id }, include: { images: { select: { side: true } }, user: { select: { id: true, role: true } } } });
    invariant(row, "NOT_FOUND", 404, "Verifikimi nuk u gjet.");
    invariant(row.status === "PENDING", "ALREADY_DECIDED", 409, "Ky dokument është vendosur tashmë.");
    const sides = row.images.map((i) => i.side);
    invariant(sides.includes("FRONT") && (sides.includes("BACK") || !backRequired(asDocumentType(row.documentType))),
      "IMAGES_MISSING", 409, "Mungojnë fotot e dokumentit.");
    const decidedAt = new Date(), status = data.decision === "APPROVE" ? "APPROVED" : "DECLINED";
    const changed = await tx.idVerification.updateMany({ where: { id: row.id, status: "PENDING" }, data: {
      status, decidedAt, decidedById: actor.id, purgeAfter: idPurgeAfter(status, decidedAt),
      declineReason: data.decision === "DECLINE" ? data.reason : null, declineNote: data.decision === "DECLINE" ? note : null,
    } });
    invariant(changed.count === 1, "ALREADY_DECIDED", 409, "Ky dokument është vendosur tashmë.");
    if (data.decision === "APPROVE" && record) {
      const fields = { legalName: data.legalName, birthDateEnc: encrypt(data.birthDate), documentType: data.documentType,
        documentNoEnc: encrypt(data.documentNumber), documentNoLast4: data.documentNumber.slice(-4), issuingCountry: data.issuingCountry,
        expiresOn: record.expires, verifiedAt: decidedAt, verifiedById: actor.id, verificationId: row.id };
      await tx.identityRecord.upsert({ where: { userId: row.userId }, create: { userId: row.userId, ...fields }, update: fields });
      if (data.documentType !== row.documentType) await tx.idVerification.update({ where: { id: row.id }, data: { documentType: data.documentType } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ID_RECORD_CREATED", target: row.userId, meta: { verificationId: row.id, documentType: data.documentType } } });
    }
    await tx.auditLog.create({ data: { actorId: actor.id, action: status === "APPROVED" ? "ID_APPROVED" : "ID_DECLINED", target: row.id,
      meta: { userId: row.userId, attempt: row.attempts, documentType: data.decision === "APPROVE" ? data.documentType : row.documentType, byRole: actor.role, ...(data.decision === "DECLINE" ? { reason: data.reason } : {}), ...(note ? { note } : {}) } } });
    await notify(tx, row.userId, status === "APPROVED" ? "ID_APPROVED" : "ID_DECLINED",
      status === "APPROVED" ? "Identiteti juaj u verifikua" : "Verifikimi i identitetit kërkon foto të reja", "/verifikimi");
    return { ok: true, status, message: status === "APPROVED" ? "U miratua." : "U refuzua; përdoruesi u njoftua." };
  });
}

/** Decrypts one ID photo for an ADMIN or a SUPPORT user with ID review granted. Every view is audited. */
export async function readIdImage(actor: Actor, id: string, side: string) {
  entityId.parse(id);
  invariant(side === "FRONT" || side === "BACK", "NOT_FOUND", 404, "Fotoja nuk u gjet.");
  await requireReviewer(actor);
  await enforceLimit(`id-image:${actor.id}`, 120, 60_000);
  const image = await db.idDocumentImage.findUnique({ where: { verificationId_side: { verificationId: id, side: side as IdSide } } });
  invariant(image, "NOT_FOUND", 404, "Fotoja nuk u gjet ose është fshirë.");
  const bytes = decryptBytes(image.dataEnc);
  invariant(createHash("sha256").update(bytes).digest("hex") === image.sha256, "INTEGRITY", 500, "Fotoja nuk kaloi kontrollin e integritetit.");
  await db.auditLog.create({ data: { actorId: actor.id, action: "ID_IMAGE_VIEWED", target: id, meta: { side, byRole: actor.role } } });
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

/* ------------------------------------------------- permanent identity record */

/** Searchable list for reviewers: no decrypted fields (document number shown as last 4 only). */
export async function listIdentityRecords(actor: Actor, q = "") {
  await requireReviewer(actor);
  const term = q.trim().slice(0, 80);
  return db.identityRecord.findMany({
    where: term ? { OR: [{ legalName: { contains: term, mode: "insensitive" } }, { documentNoLast4: term.toUpperCase().slice(-4) },
      { user: { email: { contains: term, mode: "insensitive" } } }, { user: { name: { contains: term, mode: "insensitive" } } }] } : {},
    orderBy: { verifiedAt: "desc" }, take: 100,
    select: { userId: true, legalName: true, documentType: true, documentNoLast4: true, issuingCountry: true, verifiedAt: true,
      user: { select: { email: true, role: true } } },
  });
}

/** One user's full record, decrypted, with decision and attempt history. Every view/export is audited. */
export async function identityRecordFor(actor: Actor, userId: string, mode: "VIEW" | "EXPORT") {
  entityId.parse(userId);
  await requireReviewer(actor);
  await enforceLimit(`id-record:${actor.id}`, 60, 60_000);
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, role: true, city: true, createdAt: true,
    identityRecord: true, idVerification: { select: { id: true, status: true, documentType: true, attempts: true, submittedAt: true, decidedAt: true, decidedById: true, declineReason: true, declineNote: true, imagesDeletedAt: true, purgeAfter: true } } } });
  invariant(user && (user.identityRecord || user.idVerification), "NOT_FOUND", 404, "Regjistri nuk u gjet.");
  const verificationId = user.idVerification?.id;
  const history = await db.auditLog.findMany({
    where: { OR: [{ target: userId, action: { in: ["ID_RECORD_CREATED"] } }, ...(verificationId ? [{ target: verificationId, action: { in: ["ID_SUBMITTED", "ID_APPROVED", "ID_DECLINED", "ID_IMAGES_DELETED"] } }] : [])] },
    orderBy: { createdAt: "asc" }, take: 200, select: { id: true, action: true, createdAt: true, meta: true, actor: { select: { name: true, role: true } } },
  });
  const r = user.identityRecord;
  const verifier = r ? await db.user.findUnique({ where: { id: r.verifiedById }, select: { name: true, role: true } }) : null;
  await db.auditLog.create({ data: { actorId: actor.id, action: mode === "EXPORT" ? "ID_RECORD_EXPORTED" : "ID_RECORD_VIEWED", target: userId, meta: { byRole: actor.role } } });
  return {
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, city: user.city, createdAt: user.createdAt },
    record: r ? { legalName: r.legalName, birthDate: decrypt(r.birthDateEnc), documentType: asDocumentType(r.documentType), documentNumber: decrypt(r.documentNoEnc),
      issuingCountry: r.issuingCountry, expiresOn: r.expiresOn.toISOString().slice(0, 10), verifiedAt: r.verifiedAt, verifiedBy: verifier } : null,
    verification: user.idVerification,
    history,
  };
}


/** Immediately deletes a user's ID photos (encrypted bytes in the database). Used when an admin erases an account. */
export async function deleteIdPhotosForUser(tx: Prisma.TransactionClient, userId: string, actorId: string | null, reason: string) {
  const row = await tx.idVerification.findUnique({ where: { userId }, select: { id: true } });
  if (!row) return 0;
  const removed = await tx.idDocumentImage.deleteMany({ where: { verificationId: row.id } });
  await tx.idVerification.update({ where: { id: row.id }, data: { imagesDeletedAt: new Date() } });
  await tx.auditLog.create({
    data: { actorId, action: "ID_IMAGES_DELETED", target: row.id, meta: { reason, userId, count: removed.count } },
  });
  return removed.count;
}
