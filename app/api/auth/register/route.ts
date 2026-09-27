import { api, readJson, requestIp } from "@/lib/server/http";
import { signup } from "@/lib/server/accounts";
import { accountHome, createSession } from "@/lib/server/auth";
import { scheduleAccountEmail } from "@/lib/server/account-email";
export const maxDuration = 30;
export async function POST(req: Request) {
  return api(req, async () => {
    const user = await signup(await readJson(req), requestIp(req.headers));
    scheduleAccountEmail(user.emailJobId);
    await createSession(user.id, user.passwordHash);
    return { ok: true, redirect: accountHome(user.role) };
  });
}
