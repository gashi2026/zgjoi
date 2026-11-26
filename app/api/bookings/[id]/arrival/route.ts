import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { arrivalAction } from "@/lib/server/arrival";
export const dynamic = "force-dynamic";
/** Arrita: CHECK_IN (location once, optional in-app photo) and HELPLINE. [id] is the job id. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(req, async () => arrivalAction(await requireUser(), (await ctx.params).id, await readJson(req, 1_000_000)));
}
