import { api, readJson } from "@/lib/server/http";
import { requireUser, destroySession } from "@/lib/server/auth";
import { changePassword } from "@/lib/server/accounts";
export async function POST(req: Request) {
  return api(req, async () => {
    await changePassword(await requireUser(), await readJson(req));
    await destroySession();
    return { ok: true, redirect: "/hyr" };
  });
}
