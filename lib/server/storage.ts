import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import type { Actor } from "./auth";
import { invariant } from "./errors";
import { enforceLimit } from "./rate-limit";
import { entityId } from "../marketplace-validation";

export function storageConfig() {
  const base = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  invariant(
    process.env.DOCUMENT_UPLOADS_ENABLED === "true" && base && key,
    "STORAGE_UNAVAILABLE",
    503,
    "Ngarkimi i dokumenteve nuk është ende i disponueshëm.",
  );
  const url = new URL(base);
  invariant(
    url.protocol === "https:" && /^[a-z0-9]+\.supabase\.co$/.test(url.hostname),
    "STORAGE_CONFIG",
    503,
    "Konfigurimi i dokumenteve kërkon kontroll.",
  );
  return { base: url.origin, key, bucket: "zgjoi-pro-documents" };
}
export function fileKind(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { type: "image/png", extension: "png" };
  if (b[0] === 255 && b[1] === 216 && b[2] === 255)
    return { type: "image/jpeg", extension: "jpg" };
  if (b.subarray(0, 5).toString() === "%PDF-")
    return { type: "application/pdf", extension: "pdf" };
  return null;
}
async function storage(path: string, init: RequestInit) {
  const { base, key } = storageConfig();
  return fetch(`${base}/storage/v1/${path}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers },
    cache: "no-store",
  });
}
export async function uploadDocument(actor: Actor, file: File, kind: string) {
  invariant(
    actor.role === "PRO" && actor.proProfile,
    "FORBIDDEN",
    403,
    "Nuk keni qasje.",
  );
  invariant(
    ["ID", "CERTIFICATE", "INSURANCE"].includes(kind),
    "KIND",
    400,
    "Zgjidhni llojin e dokumentit.",
  );
  await enforceLimit(`upload:${actor.id}`, 10, 3600000);
  const { bucket } = storageConfig();
  invariant(
    file.size > 0 && file.size <= 3 * 1024 * 1024,
    "SIZE",
    400,
    "Dokumenti duhet të jetë deri në 3 MB.",
  );
  invariant(
    (await db.proDocument.count({
      where: { profileId: actor.proProfile.id },
    })) < 20,
    "LIMIT",
    409,
    "Keni arritur kufirin e dokumenteve. Kontaktoni mbështetjen.",
  );
  const bytes = new Uint8Array(await file.arrayBuffer()),
    detected = fileKind(bytes);
  invariant(
    detected && detected.type === file.type,
    "FILE_TYPE",
    400,
    "Lejohen vetëm skedarë PDF, PNG ose JPEG të vlefshëm.",
  );
  const path = `${actor.id}/${randomUUID()}.${detected.extension}`;
  const filename = `${kind.toLowerCase()}.${detected.extension}`;
  const response = await storage(`object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": detected.type,
      "x-upsert": "false",
      "Cache-Control": "no-store",
    },
    body: bytes,
  });
  invariant(
    response.ok,
    "STORAGE",
    502,
    "Dokumenti nuk u ngarkua. Provoni përsëri.",
  );
  try {
    const record = await db.$transaction(async (tx) => {
      const document = await tx.proDocument.create({
        data: {
          profileId: actor.proProfile!.id,
          kind,
          storagePath: path,
          url: "private",
          filename,
          mimeType: detected.type,
          sizeBytes: file.size,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "DOCUMENT_UPLOADED",
          target: document.id,
        },
      });
      return document;
    });
    return { ok: true, id: record.id };
  } catch (error) {
    try {
      const removed = await storage(`object/${bucket}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [path] }),
      });
      if (!removed.ok)
        console.error(
          JSON.stringify({ event: "document_cleanup_required", path }),
        );
    } catch {
      console.error(
        JSON.stringify({ event: "document_cleanup_required", path }),
      );
    }
    throw error;
  }
}
export async function signedDocument(actor: Actor, id: string) {
  entityId.parse(id);
  const doc = await db.proDocument.findUnique({
    where: { id },
    include: { profile: { select: { userId: true } } },
  });
  invariant(
    doc &&
      (actor.role === "ADMIN" ||
        (actor.role === "PRO" && doc.profile.userId === actor.id)),
    "NOT_FOUND",
    404,
    "Dokumenti nuk u gjet.",
  );
  invariant(
    doc.storagePath &&
      /^[a-zA-Z0-9_-]+\/[a-f0-9-]+\.(pdf|png|jpg)$/.test(doc.storagePath),
    "LEGACY_DOCUMENT",
    409,
    "Ky dokument kërkon ngarkim të ri privat.",
  );
  await enforceLimit(`document-read:${actor.id}`, 60, 60000);
  const { base, bucket } = storageConfig();
  const response = await storage(`object/sign/${bucket}/${doc.storagePath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  invariant(response.ok, "STORAGE", 502, "Dokumenti nuk u hap.");
  const result = await response.json();
  invariant(
    typeof result.signedURL === "string" &&
      result.signedURL.startsWith(`/object/sign/${bucket}/`),
    "STORAGE",
    502,
    "Përgjigjja e dokumentit nuk është e vlefshme.",
  );
  const url = new URL(`${base}/storage/v1${result.signedURL}`);
  url.searchParams.set("download", doc.filename ?? "document");
  await db.auditLog.create({
    data: { actorId: actor.id, action: "DOCUMENT_ACCESSED", target: id },
  });
  return url.href;
}
