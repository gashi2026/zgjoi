import { api, readJson, requestIp } from "@/lib/server/http";
import { forgotPassword } from "@/lib/server/accounts";
import { scheduleAccountEmail } from "@/lib/server/account-email";
export const maxDuration = 30;
export async function POST(req: Request) {
  return api(req, async () => {
    const { emailJobId, ...result } = await forgotPassword(await readJson(req), requestIp(req.headers));
    scheduleAccountEmail(emailJobId);
    return result;
  });
}
