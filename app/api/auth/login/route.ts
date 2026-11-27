import { api, readJson, requestIp } from "@/lib/server/http";
import { authenticate } from "@/lib/server/accounts";
import { accountHome, createSession } from "@/lib/server/auth";
import { syncLocaleOnLogin } from "@/lib/server/locale";
import { localizePath } from "@/lib/i18n/config";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return api(req, async () => {
    const user = await authenticate(
      await readJson(req),
      requestIp(req.headers),
    );
    await createSession(user.id, user.passwordHash, user.mfaVersion);
    const locale = await syncLocaleOnLogin(user.id);
    return { ok: true, redirect: localizePath(accountHome(user.role), locale), locale };
  });
}
