import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { startCheckout } from "@/lib/server/payments";
import { entityId } from "@/lib/marketplace-validation";
import { z } from "zod";
export async function POST(req: Request) {
  return api(req, async () => {
    const user = await requireUser(),
      data = z.object({ requestId: entityId }).parse(await readJson(req));
    return startCheckout(user, data.requestId);
  });
}
