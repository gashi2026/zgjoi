import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { encrypt, decrypt } from "./crypto";
import { invariant } from "./errors";
import { notificationPreferences } from "./notification-preferences";
import { hashToken } from "./tokens";
import { emailRecipientAllowed, maskEmail } from "../email-allowlist";
import { isLocale, localizePath, type Locale } from "../i18n/config";
import { accountNoticeEmail, confirmSignupEmail, NOTICE_STYLE, renderEmail, resetPasswordEmail } from "../email/design";

/** Replies go to the public contact address, not the no-reply sender. */
export const EMAIL_REPLY_TO = "info@zgjoi.com";

const JOB_NOTICE_HREF =
  /^\/(llogaria|pro)\/(kerkesat\/[a-zA-Z0-9_-]+|paneli|njoftimet)$/;

/** In-app notices that also always email when delivery is configured, even if job emails are off. */
const TRANSACTIONAL_NOTICE_KINDS = new Set(["ID_APPROVED", "ID_DECLINED"]);

export function jobNoticeHrefAllowed(href: string) {
  return href === "/verifikimi" || JOB_NOTICE_HREF.test(href);
}

/** Body posted to https://api.resend.com/emails. Never include secrets here. */
export function resendEmailPayload(message: { to: string; subject: string; text: string; html?: string }) {
  return {
    from: process.env.EMAIL_FROM,
    to: [message.to],
    reply_to: EMAIL_REPLY_TO,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
  };
}

/** The recipient's saved language; Albanian when never chosen. */
export const userLocale = (value: string | null | undefined): Locale => (isLocale(value) ? value : "sq");

type EmailJob = {
  id: string;
  payloadEnc: string;
  key: string;
  attempts: number;
  lockedAt: Date;
};

export async function notify(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: string,
  title: string,
  href: string,
) {
  const notice = await tx.notification.create({ data: { userId, kind, title, href } });
  const base = applicationUrl();
  // Job emails require an operator switch AND the recipient's explicit preference.
  // ID approve/decline emails are transactional: they send whenever delivery is
  // configured, without that switch or opt-in. Content is a generic event title
  // and an authenticated account link, never a chat body, identity document,
  // address, or private capability URL.
  const transactional = TRANSACTIONAL_NOTICE_KINDS.has(kind);
  if (
    (transactional || process.env.JOB_EMAILS_ENABLED === "true") &&
    base &&
    Object.values(accountEmailSetup()).every(Boolean) &&
    jobNoticeHrefAllowed(href)
  ) {
    const [user, preferences] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true, suspendedAt: true, locale: true } }),
      notificationPreferences(tx, userId),
    ]);
    const allow = user && !user.suspendedAt && (
      transactional ? Boolean(user.email) : user.emailVerified && preferences.jobEmail
    );
    if (allow) {
      const key = kind === "MESSAGE"
        ? `job-email:${hashToken(`${userId}:${href}:${Math.floor(Date.now() / 300_000)}`)}`
        : `job-email:${notice.id}`;
      await tx.outbox.createMany({ skipDuplicates: true, data: [{ key, kind: "EMAIL", payloadEnc: encrypt(JSON.stringify({
        type: "JOB_NOTICE", kind, userId, notificationId: notice.id, to: user.email,
        expiresAt: new Date(Date.now() + 23 * 3600_000).toISOString(),
        // Email content is Albanian (approved design); the stored Albanian title is used as-is.
        ...renderEmail(accountNoticeEmail({ title, url: `${base}${href}`, ...NOTICE_STYLE[kind] })),
      })) }] });
    }
  }
  return notice;
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
  locale: Locale = "sq",
) {
  const base = applicationUrl();
  if (!base || !/^[a-fA-F0-9]{64}$/.test(process.env.ENCRYPTION_KEY ?? ""))
    return { queued: false };
  const path = localizePath(
    purpose === "EMAIL_VERIFY" ? "/verifiko-emailin" : "/rivendos-fjalekalimin",
    locale,
  );
  const job = await tx.outbox.create({
    data: {
      key: `account-email:${key}`,
      kind: "EMAIL",
      payloadEnc: encrypt(
        JSON.stringify({
          to,
          tokenId: key,
          expiresAt: expiresAt.toISOString(),
          // Same link format as before (token in the URL fragment, never sent to the server or analytics).
          ...renderEmail(
            purpose === "EMAIL_VERIFY"
              ? confirmSignupEmail(`${base}${path}#token=${token}`)
              : resetPasswordEmail(`${base}${path}#token=${token}`),
          ),
        }),
      ),
    },
  });
  return { queued: true, jobId: job.id };
}

/** First attempt for exactly the account email created by the current request.
 * The durable outbox remains responsible for later retries. No batch maintenance.
 */
export async function deliverAccountEmail(id: string) {
  if (!Object.values(accountEmailSetup()).every(Boolean)) return { accepted: false };
  const jobs = await db.$queryRaw<EmailJob[]>`
    UPDATE public."Outbox" SET state = 'PROCESSING', "lockedAt" = NOW(), attempts = attempts + 1
    WHERE id = ${id} AND kind = 'EMAIL' AND key LIKE 'account-email:%'
      AND state = 'PENDING' AND attempts = 0 AND "availableAt" <= NOW()
      AND "createdAt" > NOW() - INTERVAL '23 hours'
    RETURNING id, "payloadEnc", key, attempts, "lockedAt"`;
  return { accepted: (await submitEmailJobs(jobs)) === 1 };
}

/** Preview-only submission of one fresh verification email; no maintenance work. */
export async function deliverOneVerificationEmail(id: string, recipient: string) {
  invariant(process.env.VERCEL_ENV === "preview", "NOT_FOUND", 404, "Nuk u gjet.");
  invariant(
    Object.values(accountEmailSetup()).every(Boolean),
    "EMAIL_NOT_READY", 503, "Dërgimi i emailit nuk është aktiv.",
  );
  const job = await db.outbox.findUnique({ where: { id } });
  invariant(
    job && job.kind === "EMAIL" && job.state === "PENDING" && job.attempts === 0,
    "EMAIL_UNAVAILABLE", 409, "Emaili nuk është i disponueshëm për dërgim.",
  );
  const message = JSON.parse(decrypt(job.payloadEnc)) as { to?: string; tokenId?: string };
  invariant(
    message.to === recipient && !recipient.endsWith(".invalid") &&
      message.tokenId && job.key === `account-email:${message.tokenId}`,
    "EMAIL_RECIPIENT", 400, "Konfirmoni marrësin e emailit.",
  );
  invariant(
    emailRecipientAllowed(recipient, process.env),
    "EMAIL_NOT_ALLOWLISTED", 409,
    "Kjo adresë nuk është në listën e lejuar për emailet e provës (EMAIL_ALLOWLIST).",
  );
  const token = await db.authToken.findUnique({
    where: { id: message.tokenId },
    select: {
      purpose: true, usedAt: true, expiresAt: true,
      user: { select: { email: true, suspendedAt: true } },
    },
  });
  invariant(
    token && token.purpose === "EMAIL_VERIFY" && !token.usedAt &&
      token.expiresAt.getTime() > Date.now() &&
      token.user.email === recipient && !token.user.suspendedAt,
    "EMAIL_UNAVAILABLE", 409, "Emaili nuk është i disponueshëm për dërgim.",
  );
  const claimed = await db.$queryRaw<EmailJob[]>`
    UPDATE public."Outbox" SET state = 'PROCESSING', "lockedAt" = NOW(), attempts = attempts + 1
    WHERE id = ${job.id} AND kind = 'EMAIL' AND state = 'PENDING' AND attempts = 0
      AND "payloadEnc" = ${job.payloadEnc} AND "availableAt" <= NOW()
      AND "createdAt" > NOW() - INTERVAL '23 hours'
    RETURNING id, "payloadEnc", key, attempts, "lockedAt"`;
  invariant(
    claimed.length === 1,
    "EMAIL_UNAVAILABLE", 409, "Emaili nuk është i disponueshëm për dërgim.",
  );
  return { accepted: (await submitEmailJobs(claimed)) === 1 };
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
  const jobs = await db.$queryRaw<EmailJob[]>`
    UPDATE public."Outbox" SET state = 'PROCESSING', "lockedAt" = NOW(), attempts = attempts + 1
    WHERE id IN (SELECT id FROM public."Outbox" WHERE kind = 'EMAIL' AND attempts < 8
      AND ((state = 'PENDING' AND "availableAt" <= NOW()) OR (state = 'PROCESSING' AND "lockedAt" < NOW() - INTERVAL '5 minutes'))
      ORDER BY "availableAt" FOR UPDATE SKIP LOCKED LIMIT 10)
    RETURNING id, "payloadEnc", key, attempts, "lockedAt"`;
  return { enabled: true, delivered: await submitEmailJobs(jobs) };
}

/** Only the explicitly claimed rows are updated or submitted to the provider. */
async function submitEmailJobs(jobs: EmailJob[]) {
  let delivered = 0;
  for (const job of jobs) {
    try {
      const message = JSON.parse(decrypt(job.payloadEnc)) as {
        to: string;
        subject: string;
        text: string;
        html?: string;
        tokenId?: string;
        expiresAt?: string;
        type?: string;
        kind?: string;
        userId?: string;
        notificationId?: string;
      };
      if (message.type === "JOB_NOTICE") {
        const transactional = TRANSACTIONAL_NOTICE_KINDS.has(message.kind ?? "");
        const user = message.userId && await db.user.findUnique({ where: { id: message.userId }, select: { email: true, emailVerified: true, suspendedAt: true } });
        const notice = message.notificationId && await db.notification.findUnique({ where: { id: message.notificationId }, select: { userId: true } });
        const preference = !transactional && message.userId ? await notificationPreferences(db, message.userId) : null;
        const recipientOk = !!user && !user.suspendedAt && user.email === message.to && !!notice && notice.userId === message.userId;
        const allowed = transactional
          ? recipientOk
          : recipientOk && process.env.JOB_EMAILS_ENABLED === "true" && user.emailVerified && preference?.jobEmail;
        if (!allowed) throw new Error("MESSAGE_SUPPRESSED");
      }
      if (message.tokenId) {
        const token = await db.authToken.findUnique({
          where: { id: message.tokenId },
          select: { expiresAt: true, usedAt: true, purpose: true,
            user: { select: { email: true, suspendedAt: true } } },
        });
        if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now())
          throw new Error("EXPIRED_MESSAGE");
        if (token.user.suspendedAt || token.user.email !== message.to ||
          !["EMAIL_VERIFY", "PASSWORD_RESET"].includes(token.purpose) || job.key !== `account-email:${message.tokenId}`)
          throw new Error("MESSAGE_SUPPRESSED");
      }
      if (job.key.startsWith("account-email:") && !message.tokenId) throw new Error("MESSAGE_SUPPRESSED");
      if (message.expiresAt && !(Date.parse(message.expiresAt) > Date.now()))
        throw new Error("EXPIRED_MESSAGE");
      if (message.to.endsWith(".invalid")) throw new Error("TEST_ADDRESS");
      // Outside production only allowlisted owner/test addresses receive mail.
      if (!emailRecipientAllowed(message.to, process.env)) {
        console.info(JSON.stringify({
          event: "email_skipped_not_allowlisted",
          environment: process.env.VERCEL_ENV ?? "local",
          recipient: maskEmail(message.to),
          job: job.id,
        }));
        throw new Error("NOT_ALLOWLISTED");
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": job.key,
        },
        body: JSON.stringify(resendEmailPayload(message)),
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
        /^(TEST_ADDRESS|NOT_ALLOWLISTED|EXPIRED_MESSAGE|MESSAGE_SUPPRESSED|EMAIL_STATUS_\d+|EMAIL_NO_RECEIPT)$/.test(
          error.message,
        )
          ? error.message
          : "EMAIL_DELIVERY_FAILED";
      await db.outbox.updateMany({
        where: { id: job.id, state: "PROCESSING", lockedAt: job.lockedAt },
        data: {
          state:
            job.attempts >= 8 ||
            ["TEST_ADDRESS", "NOT_ALLOWLISTED", "EXPIRED_MESSAGE", "MESSAGE_SUPPRESSED"].includes(code)
              ? "FAILED"
              : "PENDING",
          ...(code === "MESSAGE_SUPPRESSED" || job.attempts >= 8 ||
          ["TEST_ADDRESS", "NOT_ALLOWLISTED", "EXPIRED_MESSAGE"].includes(code)
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
  return delivered;
}
