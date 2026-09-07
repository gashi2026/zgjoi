import { api } from "@/lib/server/http";
import { currentSupport } from "@/lib/server/support";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, currentSupport);
}
