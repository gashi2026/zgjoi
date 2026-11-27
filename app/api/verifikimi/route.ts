import { api } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { invariant } from "@/lib/server/errors";
import { idStatusFor, idUploadsAvailable, submitIdVerification } from "@/lib/server/id-verification";
import { ID_MAX_IMAGE_BYTES } from "@/lib/id-verification";
import { getT } from "@/lib/i18n/server";
export const runtime = "nodejs";
export const maxDuration = 30;
// Two converted photos plus multipart overhead; stays under Vercel's 4.5 MB request limit.
const MAX_BODY = 2 * ID_MAX_IMAGE_BYTES + 64 * 1024;

export async function GET(req: Request) {
  return api(req, async () => {
    const actor = await requireUser();
    const row = await idStatusFor(actor.id);
    return { available: idUploadsAvailable(), status: row?.status ?? null, declineReason: row?.declineReason ?? null, declineNote: row?.declineNote ?? null };
  });
}

export async function POST(req: Request) {
  const t = await getT();
  return api(req, async () => {
    const actor = await requireUser();
    invariant(req.headers.get("content-type")?.startsWith("multipart/form-data"), "CONTENT_TYPE", 415, t("api.formatIsntValid"));
    const reader = req.body?.getReader();
    invariant(reader, "EMPTY", 400, t("api.requestEmpty"));
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > MAX_BODY) {
        await reader.cancel();
        invariant(false, "SIZE", 413, t("api.photosTooLargeEach"));
      }
      chunks.push(part.value);
    }
    const form = await new Request(req.url, { method: "POST", headers: { "Content-Type": req.headers.get("content-type")! }, body: Buffer.concat(chunks) }).formData();
    return submitIdVerification(actor, form.get("front"), form.get("back"), form.get("documentType"));
  });
}
