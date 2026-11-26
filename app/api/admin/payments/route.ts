import { z } from "zod";
import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { entityId } from "@/lib/marketplace-validation";
import { releasePayment, refundHeldPayment, markPaidOffline } from "@/lib/server/payments";
export async function POST(req: Request) {
  return api(req, async () => {
    const actor = await requireRole("ADMIN");
    const data = z
      .object({
        action: z.enum(["RELEASE", "REFUND", "MARK_PAID_OFFLINE"]),
        id: entityId,
        reason: z.string().max(4000).optional(),
      })
      .parse(await readJson(req));
    if (data.action === "MARK_PAID_OFFLINE")
      return markPaidOffline(actor, data.id, data.reason ?? "");
    return data.action === "RELEASE"
      ? releasePayment(actor, data.id)
      : refundHeldPayment(actor, data.id, data.reason ?? "");
  });
}
