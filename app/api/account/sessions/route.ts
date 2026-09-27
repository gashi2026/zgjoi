import { api, readJson } from "@/lib/server/http";
import { requireUser, accountSessions, currentSessionHash } from "@/lib/server/auth";
import { revokeOtherSessions } from "@/lib/server/accounts";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => ({ sessions: await accountSessions(await requireUser()) }));
}
export async function POST(req: Request) {
  return api(req, async () => revokeOtherSessions(await requireUser(), await currentSessionHash(), await readJson(req)));
}
