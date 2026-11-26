import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { logContact } from "@/lib/server/arrival";
export const dynamic = "force-dynamic";
/** Admin logs the result of contacting the customer during the helpline wait. */
export async function POST(req: Request) {
  return api(req, async () => logContact(await requireUser(), await readJson(req)));
}
