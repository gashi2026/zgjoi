import { api, readJson } from "@/lib/server/http";
import { sendSupport } from "@/lib/server/support";
export async function POST(req: Request) {
  return api(req, async () => sendSupport(await readJson(req)));
}
