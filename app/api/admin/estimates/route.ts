import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { adminEstimateAction } from "@/lib/server/estimates";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => adminEstimateAction(await requireRole("ADMIN"), await readJson(req)));
}
