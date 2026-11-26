import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { readJobMessages, sendJobMessage } from "@/lib/server/marketplace";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => {
    const user = await requireUser(),
      p = new URL(req.url).searchParams;
    return readJobMessages(
      user,
      p.get("conversationId") || "",
      p.get("before") || undefined,
    );
  });
}
export async function POST(req: Request) {
  return api(req, async () =>
    sendJobMessage(await requireUser(), await readJson(req)),
  );
}
