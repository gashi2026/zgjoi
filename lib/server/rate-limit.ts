import "server-only";
import { db } from "./db";
import { hashToken } from "./tokens";
import { AppError } from "./errors";

/** Atomic shared limiter. IP and email identifiers are hashed before storage. */
export async function rateLimit(
  keyName: string,
  limit: number,
  windowMs: number,
) {
  const key = hashToken(keyName);
  const rows = await db.$queryRaw<{ hits: number; resetAt: Date }[]>`
    INSERT INTO public."RateLimitBucket" ("key", "hits", "resetAt")
    VALUES (${key}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond')
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1 ELSE "RateLimitBucket"."hits" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN NOW() + ${windowMs} * INTERVAL '1 millisecond' ELSE "RateLimitBucket"."resetAt" END
    RETURNING "hits", "resetAt"`;
  return {
    ok: rows[0].hits <= limit,
    remaining: Math.max(0, limit - rows[0].hits),
    retryInMs: Math.max(0, rows[0].resetAt.getTime() - Date.now()),
  };
}

export async function enforceLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  if (!(await rateLimit(key, limit, windowMs)).ok) {
    throw new AppError(
      "RATE_LIMIT",
      429,
      "Shumë përpjekje. Prisni pak dhe provoni përsëri.",
    );
  }
}
