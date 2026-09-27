import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { createOffer } from "@/lib/server/marketplace";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => {
    return createOffer(await requireUser(), await readJson(req));
  });
}
