import { z } from "zod";
import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { openDispute, respondDispute } from "@/lib/server/disputes";
export const dynamic = "force-dynamic";
/** No action (or OPEN) flags the job; RESPOND adds the other side's statement. */
export async function POST(req: Request) {
  return api(req, async () => {
    const actor = await requireUser();
    const body = await readJson(req);
    const { action } = z.object({ action: z.enum(["OPEN", "RESPOND"]).default("OPEN") }).passthrough().parse(body);
    return action === "RESPOND" ? respondDispute(actor, body) : openDispute(actor, body);
  });
}
