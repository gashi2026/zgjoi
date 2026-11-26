import { z } from "zod";
import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { entityId } from "@/lib/marketplace-validation";
import { completeBookingTodo } from "@/lib/server/bookings";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => {
    const actor = await requireRole("ADMIN");
    const data = z.object({ action: z.literal("TODO_DONE"), id: entityId, reason: z.string().max(500).default("") }).parse(await readJson(req));
    return completeBookingTodo(actor, data.id, data.reason);
  });
}
