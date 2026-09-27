import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { publishReview } from "@/lib/server/marketplace";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => {
    return publishReview(await requireUser(), await readJson(req));
  });
}
