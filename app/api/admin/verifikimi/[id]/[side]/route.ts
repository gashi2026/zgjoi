import { api } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { readIdImage } from "@/lib/server/id-verification";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Streams a decrypted ID photo to an administrator only. No public or signed storage URL exists. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; side: string }> }) {
  return api(req, async () => {
    const { id, side } = await params;
    const { bytes, mimeType } = await readIdImage(await requireRole("ADMIN"), id, side.toUpperCase());
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      "X-Robots-Tag": "noindex, nofollow",
    } });
  });
}
