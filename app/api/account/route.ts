import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { updateAccount } from "@/lib/server/accounts";
export async function POST(req: Request) {
  return api(req, async () =>
    updateAccount(await requireUser(), await readJson(req)),
  );
}
