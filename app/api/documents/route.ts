import { api } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { invariant } from "@/lib/server/errors";
import { uploadDocument } from "@/lib/server/storage";
import { getT } from "@/lib/i18n/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const t = await getT();
  return api(req, async () => {
    const actor = await requireRole("PRO");
    invariant(
      req.headers.get("content-type")?.startsWith("multipart/form-data"),
      "CONTENT_TYPE",
      415,
      t("api.formatIsntValid"),
    );
    const reader = req.body?.getReader();
    invariant(reader, "EMPTY", 400, t("api.requestEmpty"));
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 3 * 1024 * 1024 + 16384) {
        await reader.cancel();
        invariant(false, "SIZE", 413, t("api.documentTooLarge"));
      }
      chunks.push(part.value);
    }
    const copy = new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": req.headers.get("content-type")! },
      body: Buffer.concat(chunks),
    });
    const form = await copy.formData(),
      file = form.get("file");
    invariant(file instanceof File, "FILE", 400, t("api.chooseDocument"));
    return uploadDocument(actor, file, String(form.get("kind") ?? ""));
  });
}
