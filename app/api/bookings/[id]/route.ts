import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { bookingAction } from "@/lib/server/bookings";
export const dynamic = "force-dynamic";
/** [id] is the job (ServiceRequest) id, the same id the chat page uses. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(req, async () => bookingAction(await requireUser(), (await ctx.params).id, await readJson(req)));
}
