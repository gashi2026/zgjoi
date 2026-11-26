import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { requestEstimate } from "@/lib/server/estimates";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => requestEstimate(await requireUser(), await readJson(req)));
}
