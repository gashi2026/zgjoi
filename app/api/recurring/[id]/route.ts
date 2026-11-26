import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { seriesAction } from "@/lib/server/recurring-series";
export const dynamic = "force-dynamic";
/** Confirm/decline a pro's proposal, pause, resume or cancel a recurring Book now series. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(req, async () => seriesAction(await requireUser(), (await ctx.params).id, await readJson(req)));
}
