import { api } from "@/lib/server/http";
import { supportThread } from "@/lib/server/support";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => {
    const p = new URL(req.url).searchParams;
    return supportThread(
      p.get("ticketId") || undefined,
      p.get("before") || undefined,
    );
  });
}
