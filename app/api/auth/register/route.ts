import { api, readJson, requestIp } from "@/lib/server/http";
import { signup } from "@/lib/server/accounts";
import { nextPathFor, createSession } from "@/lib/server/auth";
import { scheduleAccountEmail } from "@/lib/server/account-email";
import { idUploadsAvailable } from "@/lib/server/id-verification";
export const maxDuration = 30;
export async function POST(req: Request) {
  return api(req, async () => {
    const user = await signup(await readJson(req), requestIp(req.headers));
    scheduleAccountEmail(user.emailJobId);
    await createSession(user.id, user.passwordHash);
    // Sign-up wizard: the ID upload is the next (required) step for every customer and pro.
    return { ok: true, redirect: nextPathFor(user, idUploadsAvailable()) };
  });
}
