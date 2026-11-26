import { after } from "next/server";
import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { createBooking } from "@/lib/server/bookings";
import { geocodeBooking } from "@/lib/server/arrival";
import { generateForSeries } from "@/lib/server/recurring-series";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => {
    const result = await createBooking(await requireUser(), await readJson(req));
    // Arrita: locate the booking address once, after the response (free Nominatim, cached).
    if (result.id) after(() => geocodeBooking(result.id).catch(() => undefined));
    // Recurring schedule: create the next occurrences within the horizon right away.
    if (result.seriesId) {
      const seriesId = result.seriesId;
      after(() => generateForSeries(seriesId).catch(() => undefined));
    }
    return result;
  });
}
