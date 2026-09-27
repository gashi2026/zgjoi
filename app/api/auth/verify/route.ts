import { api, readJson, requestIp } from "@/lib/server/http";
import { consumeAccountToken } from "@/lib/server/accounts";
import { enforceLimit } from "@/lib/server/rate-limit";
export async function POST(req: Request) {
  return api(req, async () => {
    await enforceLimit(`verify:${requestIp(req.headers)}`, 20, 3600000);
    return consumeAccountToken(await readJson(req), "EMAIL_VERIFY");
  });
}
