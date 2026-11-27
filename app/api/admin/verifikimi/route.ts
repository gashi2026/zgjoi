import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { adminDecideId } from "@/lib/server/id-verification";
export async function POST(req: Request) {
  return api(req, async () => adminDecideId(await requireRole("ADMIN"), await readJson(req)));
}
