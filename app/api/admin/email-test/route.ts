import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { api, readJson } from "@/lib/server/http";
import { deliverOneVerificationEmail } from "@/lib/server/notifications";
import { entityId } from "@/lib/marketplace-validation";
import { email } from "@/lib/validation";

export async function POST(req: Request) {
  return api(req, async () => {
    await requireRole("ADMIN");
    const input = z.object({ outboxId: entityId, recipient: email }).parse(await readJson(req));
    return deliverOneVerificationEmail(input.outboxId, input.recipient);
  });
}
