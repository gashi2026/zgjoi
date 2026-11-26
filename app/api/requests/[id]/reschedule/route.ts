import { z } from "zod";
import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { proposeReschedule, decideReschedule } from "@/lib/server/rescheduling";
export const dynamic = "force-dynamic";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(req, async () => {
    const actor = await requireUser(), { id } = await ctx.params;
    const { action, ...data } = z.object({ action: z.enum(["PROPOSE", "ACCEPT", "DECLINE", "WITHDRAW"]) }).passthrough().parse(await readJson(req));
    return action === "PROPOSE" ? proposeReschedule(actor, id, data) : decideReschedule(actor, id, { ...data, action });
  });
}
