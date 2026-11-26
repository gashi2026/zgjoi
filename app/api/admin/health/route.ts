import { requireRole } from "@/lib/server/auth";
import { api } from "@/lib/server/http";
import { operationalHealth } from "@/lib/server/operations";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => {
    await requireRole("ADMIN");
    return operationalHealth();
  });
}
