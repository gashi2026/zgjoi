import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { openDispute } from "@/lib/server/disputes";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => {
    return openDispute(await requireUser(), await readJson(req));
  });
}
