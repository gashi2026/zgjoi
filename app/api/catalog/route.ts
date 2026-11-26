import { api } from "@/lib/server/http";
import { searchPros } from "@/lib/server/catalog";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => {
    return searchPros(Object.fromEntries(new URL(req.url).searchParams));
  });
}
