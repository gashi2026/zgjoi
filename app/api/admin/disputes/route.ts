import { z } from "zod";
import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { entityId } from "@/lib/marketplace-validation";
import { decideDispute, completeDisputeTodo } from "@/lib/server/disputes";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => {
    const actor = await requireRole("ADMIN");
    const body = await readJson(req);
    const data = z.object({ action: z.enum(["DECIDE", "TODO_DONE"]), id: entityId, reason: z.string().max(500).default("") }).passthrough().parse(body);
    return data.action === "DECIDE" ? decideDispute(actor, data.id, body) : completeDisputeTodo(actor, data.id, data.reason);
  });
}
