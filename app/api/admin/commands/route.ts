import { api, readJson } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { adminCommand } from "@/lib/server/admin";
export async function POST(req: Request) {
  return api(req, async () =>
    adminCommand(await requireRole("ADMIN"), await readJson(req)),
  );
}
