import { db } from "@/lib/server/db";
import { json } from "@/lib/server/http";
import { equalSecret } from "@/lib/server/tokens";
import { deliverOutbox } from "@/lib/server/notifications";
import { serializable } from "@/lib/server/marketplace";
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
    const expired = await serializable(async (tx) => {
      const quotes = await tx.quote.findMany({
        where: {
          state: "SENT",
          expiresAt: { lte: now },
          request: { state: "QUOTED" },
        },
        take: 100,
      });
      for (const quote of quotes) {
        await tx.quote.update({
          where: { id: quote.id },
          data: { state: "EXPIRED" },
        });
        await tx.serviceRequest.updateMany({
          where: {
            id: quote.requestId,
            state: "QUOTED",
            acceptedQuoteId: null,
          },
          data: { state: "OPEN", version: { increment: 1 } },
        });
      }
      return quotes.length;
    });
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
