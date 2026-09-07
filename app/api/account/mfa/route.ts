import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { manageMfa, mfaStatus } from "@/lib/server/mfa";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => mfaStatus(await requireUser()));
}
export async function POST(req: Request) {
  return api(req, async () => manageMfa(await requireUser(), await readJson(req)));
}
