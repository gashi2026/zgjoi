import { z } from "zod";
import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { cancelEstimate } from "@/lib/server/estimates";
export const dynamic = "force-dynamic";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(req, async () => {
    z.object({ action: z.literal("CANCEL") }).parse(await readJson(req));
    return cancelEstimate(await requireUser(), (await ctx.params).id);
  });
}
