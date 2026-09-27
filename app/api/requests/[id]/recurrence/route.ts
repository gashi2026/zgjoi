import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { createRecurringRequest } from "@/lib/server/recurring";
export const dynamic = "force-dynamic";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(req, async () => {
    const { id } = await ctx.params;
    return createRecurringRequest(await requireUser(), id, await readJson(req));
  });
}
