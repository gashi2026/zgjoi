import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { setIdReviewPermission } from "@/lib/server/id-verification";
/** ADMIN grants or revokes ID review for one SUPPORT user. */
export async function POST(req: Request) {
  return api(req, async () => setIdReviewPermission(await requireRole("ADMIN"), await readJson(req)));
}
