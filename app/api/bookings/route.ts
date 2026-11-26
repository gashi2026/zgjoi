import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { createBooking } from "@/lib/server/bookings";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => createBooking(await requireUser(), await readJson(req)));
}
