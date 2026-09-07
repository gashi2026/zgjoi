import { api, readJson, requestIp } from "@/lib/server/http";
import { signup } from "@/lib/server/accounts";
import { accountHome, createSession } from "@/lib/server/auth";
export async function POST(req: Request) {
  return api(req, async () => {
    const user = await signup(await readJson(req), requestIp(req.headers));
    await createSession(user.id);
    return { ok: true, redirect: accountHome(user.role) };
  });
}
