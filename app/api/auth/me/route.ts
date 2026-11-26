import { api } from "@/lib/server/http";
import { currentUser } from "@/lib/server/auth";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => {
    const user = await currentUser();
    return {
      user: user ? { id: user.id, name: user.name, role: user.role } : null,
    };
  });
}
