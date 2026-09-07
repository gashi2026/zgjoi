import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { encrypt, decrypt } from "./crypto";

export async function notify(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: string,
  title: string,
  href: string,
) {
  return tx.notification.create({ data: { userId, kind, title, href } });
}

export function applicationUrl() {
  const raw = process.env.APP_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && url.hostname === "localhost")
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

/** Administrator diagnostics expose readiness flags, never environment values. */
export function accountEmailSetup() {
  return {
    deliveryEnabled: process.env.EMAIL_DELIVERY_ENABLED === "true",
    apiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    senderPresent: Boolean(process.env.EMAIL_FROM),
    linkOriginValid: Boolean(applicationUrl()),
    encryptionKeyValid: /^[a-fA-F0-9]{64}$/.test(process.env.ENCRYPTION_KEY ?? ""),
  };
}

export async function queueAccountEmail(
  tx: Prisma.TransactionClient,
  to: string,
  purpose: string,
  token: string,
  key: string,
  expiresAt: Date,
) {
  const base = applicationUrl();
  if (!base || !/^[a-fA-F0-9]{64}$/.test(process.env.ENCRYPTION_KEY ?? ""))
    return { queued: false };
  const path =
    purpose === "EMAIL_VERIFY" ? "/verifiko-emailin" : "/rivendos-fjalekalimin";
  await tx.outbox.create({
    data: {
      key: `account-email:${key}`,
      kind: "EMAIL",
      payloadEnc: encrypt(
        JSON.stringify({
          to,
          tokenId: key,
          expiresAt: expiresAt.toISOString(),
          subject:
            purpose === "EMAIL_VERIFY"
              ? "Verifikoni emailin tuaj — Zgjoi"
              : "Rivendosni fjalëkalimin — Zgjoi",
          text: `Hapni këtë lidhje për të vazhduar: ${base}${path}#token=${token}\nNëse nuk e keni kërkuar këtë veprim, injorojeni këtë email.`,
        }),
      ),
    },
  });
  return { queued: true };
}

/** Called only by the authenticated maintenance worker. Delivery is explicitly opt-in. */
export async function deliverOutbox() {
  if (
    process.env.EMAIL_DELIVERY_ENABLED !== "true" ||
    !process.env.RESEND_API_KEY ||
    !process.env.EMAIL_FROM
  )
    return { enabled: false, delivered: 0 };
  // A lost provider response must never cause a fresh send beyond its 24h dedupe window.
  await db.outbox.updateMany({
    where: {
      kind: "EMAIL",
      state: { in: ["PENDING", "PROCESSING"] },
      createdAt: { lt: new Date(Date.now() - 23 * 3600000) },
    },
    data: {
      state: "FAILED",
      lastError: "DELIVERY_WINDOW_EXPIRED",
      payloadEnc: "",
      lockedAt: null,
    },
  });
  // A worker can die after claiming its final attempt. Do not strand the job
  // or retain its account token indefinitely; a fresh recovery request is needed.
  await db.outbox.updateMany({
    where: {
      kind: "EMAIL", attempts: { gte: 8 },
      OR: [
        { state: "PENDING" },
        { state: "PROCESSING", lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      ],
    },
    data: { state: "FAILED", lastError: "DELIVERY_ATTEMPTS_EXHAUSTED", payloadEnc: "", lockedAt: null },
  });
  const jobs = await db.$queryRaw<
    { id: string; payloadEnc: string; key: string; attempts: number; lockedAt: Date }[]
  >`
    UPDATE public."Outbox" SET state = 'PROCESSING', "lockedAt" = NOW(), attempts = attempts + 1
    WHERE id IN (SELECT id FROM public."Outbox" WHERE kind = 'EMAIL' AND attempts < 8
      AND ((state = 'PENDING' AND "availableAt" <= NOW()) OR (state = 'PROCESSING' AND "lockedAt" < NOW() - INTERVAL '5 minutes'))
      ORDER BY "availableAt" FOR UPDATE SKIP LOCKED LIMIT 10)
    RETURNING id, "payloadEnc", key, attempts, "lockedAt"`;
  let delivered = 0;
  for (const job of jobs) {
    try {
      const message = JSON.parse(decrypt(job.payloadEnc)) as {
        to: string;
        subject: string;
        text: string;
        tokenId?: string;
        expiresAt?: string;
      };
      if (message.tokenId) {
        const token = await db.authToken.findUnique({
          where: { id: message.tokenId },
          select: { expiresAt: true, usedAt: true },
        });
        if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now())
          throw new Error("EXPIRED_MESSAGE");
      }
      if (message.expiresAt && !(Date.parse(message.expiresAt) > Date.now()))
        throw new Error("EXPIRED_MESSAGE");
      if (message.to.endsWith(".invalid")) throw new Error("TEST_ADDRESS");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": job.key,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
      });
      if (!response.ok) throw new Error(`EMAIL_STATUS_${response.status}`);
      const result = await response.json();
      if (typeof result.id !== "string" || !result.id.trim()) throw new Error("EMAIL_NO_RECEIPT");
      const saved = await db.outbox.updateMany({
        where: { id: job.id, state: "PROCESSING", lockedAt: job.lockedAt },
        data: {
          state: "SENT",
          sentAt: new Date(),
          payloadEnc: "",
          lastError: null,
          lockedAt: null,
        },
      });
      delivered += saved.count;
    } catch (error) {
      const code =
        error instanceof Error &&
        /^(TEST_ADDRESS|EXPIRED_MESSAGE|EMAIL_STATUS_\d+|EMAIL_NO_RECEIPT)$/.test(
          error.message,
        )
          ? error.message
          : "EMAIL_DELIVERY_FAILED";
      await db.outbox.updateMany({
        where: { id: job.id, state: "PROCESSING", lockedAt: job.lockedAt },
        data: {
          state:
            job.attempts >= 8 ||
            ["TEST_ADDRESS", "EXPIRED_MESSAGE"].includes(code)
              ? "FAILED"
              : "PENDING",
          ...(job.attempts >= 8 ||
          ["TEST_ADDRESS", "EXPIRED_MESSAGE"].includes(code)
            ? { payloadEnc: "" }
            : {}),
          lastError: code,
          availableAt: new Date(
            Date.now() + Math.min(6 * 60 * 60_000, 60_000 * 2 ** job.attempts),
          ),
          lockedAt: null,
        },
      });
    }
  }
  return { enabled: true, delivered };
}
