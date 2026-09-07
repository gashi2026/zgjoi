import { api, readJson, requestIp } from "@/lib/server/http";
import { authenticate } from "@/lib/server/accounts";
import { accountHome, createSession } from "@/lib/server/auth";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => {
    const user = await authenticate(
      await readJson(req),
      requestIp(req.headers),
    );
    await createSession(user.id, user.passwordHash);
    return { ok: true, redirect: accountHome(user.role) };
  });
}
