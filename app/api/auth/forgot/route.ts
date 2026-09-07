import { api, readJson, requestIp } from "@/lib/server/http";
import { forgotPassword } from "@/lib/server/accounts";
export async function POST(req: Request) {
  return api(req, async () =>
    forgotPassword(await readJson(req), requestIp(req.headers)),
  );
}
