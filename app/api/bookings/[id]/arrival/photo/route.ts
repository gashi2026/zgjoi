import { api } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { arrivalPhoto } from "@/lib/server/arrival";
export const dynamic = "force-dynamic";
/** The check-in photo: the pro who took it and admins only, never the customer. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(req, async () => {
    const photo = await arrivalPhoto(await requireUser(), (await ctx.params).id);
    return new Response(new Uint8Array(photo.bytes), { headers: {
      "Content-Type": photo.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'", "Content-Disposition": "inline" } });
  });
}
