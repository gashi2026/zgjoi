import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { getRequest, changeJob } from "@/lib/server/marketplace";
import { entityId } from "@/lib/marketplace-validation";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return api(req, async () =>
    getRequest(await requireUser(), (await ctx.params).id),
  );
}
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return api(req, async () => {
    const user = await requireUser();
    const data = z
      .object({
        action: z.enum([
          "START",
          "REQUEST_COMPLETION",
          "CONFIRM_COMPLETION",
          "CANCEL",
          "DECLINE",
          "WITHDRAW",
        ]),
        quoteId: entityId.optional(),
      })
      .parse(await readJson(req));
    return changeJob(user, (await ctx.params).id, data.action, data.quoteId);
  });
}
