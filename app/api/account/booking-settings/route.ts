import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { saveBookingSettings } from "@/lib/server/bookings";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => saveBookingSettings(await requireRole("PRO"), await readJson(req)));
}
