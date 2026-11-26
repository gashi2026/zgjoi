import { api, readJson } from "@/lib/server/http";
import { replySupport } from "@/lib/server/support";
export async function POST(req: Request) {
  return api(req, async () => replySupport(await readJson(req)));
}
