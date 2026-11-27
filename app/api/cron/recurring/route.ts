import { json } from "@/lib/server/http";
import { equalSecret } from "@/lib/server/tokens";
import { generateRecurringBookings } from "@/lib/server/recurring-series";
import { purgeExpiredIdImages } from "@/lib/server/id-verification";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Daily: turns upcoming occurrences of ACTIVE recurring series into Book now
 * bookings (payment PENDING, admin marks paid in the beta). Never moves money.
 * Also deletes ID photos whose retention has passed (shares this cron: the plan allows two). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !equalSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`))
    return json({ error: "FORBIDDEN" }, 403);
  try {
    const now = new Date();
    const purge = await purgeExpiredIdImages(now).catch(() => {
      console.error(JSON.stringify({ event: "id_purge_failed" }));
      return { idPurgeFailed: true };
    });
    return json({ ok: true, ...(await generateRecurringBookings(now)), ...purge });
  } catch {
    console.error(JSON.stringify({ event: "recurring_cron_failed" }));
    return json({ error: "RECURRING_FAILED" }, 503);
  }
}
