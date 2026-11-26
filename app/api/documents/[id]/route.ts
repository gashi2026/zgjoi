import { api } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { signedDocument } from "@/lib/server/storage";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(
    req,
    async () =>
      new Response(null, {
        status: 303,
        headers: {
          Location: await signedDocument(
            await requireUser(),
            (await params).id,
          ),
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      }),
  );
}
