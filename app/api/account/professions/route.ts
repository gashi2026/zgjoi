import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { saveProfessions } from "@/lib/server/pro-categories";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => saveProfessions(await requireRole("PRO"), await readJson(req)));
}
