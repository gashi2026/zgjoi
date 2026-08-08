import "server-only";

/**
 * Small in-memory limiter. Good enough for login and support-chat abuse
 * on a single instance; swap for Upstash Redis when you run more than one.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(keyName: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(keyName);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(keyName, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryInMs: bucket.resetAt - now };
  }
  return { ok: true, remaining: limit - bucket.count };
}

/* Periodically drop expired buckets so the map cannot grow forever. */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }, 60_000).unref?.();
}
