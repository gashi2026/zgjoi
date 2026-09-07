import { db } from "@/lib/server/db";
import { json } from "@/lib/server/http";
import { equalSecret } from "@/lib/server/tokens";
import { deliverOutbox } from "@/lib/server/notifications";
import { expireOffers } from "@/lib/server/offer-expiry";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Maintenance never fabricates financial state or automatically releases funds. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    !equalSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`)
  )
    return json({ error: "FORBIDDEN" }, 403);
  try {
    const now = new Date();
    const expired = await expireOffers(now);
    const [sessions, tokens, limits] = await db.$transaction([
      db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
      db.authToken.deleteMany({
        where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86400000) } },
      }),
      db.rateLimitBucket.deleteMany({
        where: { resetAt: { lt: new Date(now.getTime() - 86400000) } },
      }),
    ]);
    const delivery = await deliverOutbox();
    await db.setting.upsert({
      where: { key: "maintenanceHeartbeat" },
      create: {
        key: "maintenanceHeartbeat",
        value: { ranAt: now.toISOString() },
      },
      update: { value: { ranAt: now.toISOString() } },
    });
    return json({
      ok: true,
      expired,
      cleaned: {
        sessions: sessions.count,
        tokens: tokens.count,
        limits: limits.count,
      },
      delivery,
    });
  } catch {
    console.error(JSON.stringify({ event: "maintenance_failed" }));
    return json({ error: "MAINTENANCE_FAILED" }, 503);
  }
}
