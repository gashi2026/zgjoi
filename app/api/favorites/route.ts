import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { favorite } from "@/lib/server/catalog";
import { entityId } from "@/lib/marketplace-validation";
import { z } from "zod";
export async function POST(req: Request) {
  return api(req, async () => {
    const user = await requireUser();
    const data = z
      .object({ profileId: entityId, saved: z.boolean() })
      .parse(await readJson(req));
    return favorite(user, data.profileId, data.saved);
  });
}
