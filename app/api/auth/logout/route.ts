import { api } from "@/lib/server/http";
import { destroySession } from "@/lib/server/auth";
export async function POST(req: Request) {
  return api(req, async () => {
    await destroySession();
    return { ok: true, redirect: "/" };
  });
}
