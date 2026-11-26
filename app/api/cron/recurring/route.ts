import { json } from "@/lib/server/http";
import { equalSecret } from "@/lib/server/tokens";
import { generateRecurringBookings } from "@/lib/server/recurring-series";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Daily: turns upcoming occurrences of ACTIVE recurring series into Book now
 * bookings (payment PENDING, admin marks paid in the beta). Never moves money. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !equalSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`))
    return json({ error: "FORBIDDEN" }, 403);
  try {
    return json({ ok: true, ...(await generateRecurringBookings(new Date())) });
  } catch {
    console.error(JSON.stringify({ event: "recurring_cron_failed" }));
    return json({ error: "RECURRING_FAILED" }, 503);
  }
}
