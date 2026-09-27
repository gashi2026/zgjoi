import { z } from "zod";
import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { entityId } from "@/lib/marketplace-validation";
import { releasePayment, refundHeldPayment } from "@/lib/server/payments";
export async function POST(req: Request) {
  return api(req, async () => {
    const actor = await requireRole("ADMIN");
    const data = z
      .object({
        action: z.enum(["RELEASE", "REFUND"]),
        id: entityId,
        reason: z.string().optional(),
      })
      .parse(await readJson(req));
    return data.action === "RELEASE"
      ? releasePayment(actor, data.id)
      : refundHeldPayment(actor, data.id, data.reason ?? "");
  });
}
