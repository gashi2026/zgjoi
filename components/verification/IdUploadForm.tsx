"use client";
import { msgKey } from "@/lib/i18n/translate";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "@/lib/i18n/client";
import { buttonClass } from "@/components/marketplace/ApiForm";
import { ID_MAX_IMAGE_BYTES, ID_MAX_SOURCE_BYTES, ID_MIN_EDGE_PX, ID_TARGET_EDGE_PX, ID_DOCUMENT_TYPES, backRequired, idDocumentTypeLabels, sideLabel, type IdDocumentType, type IdSide } from "@/lib/id-verification";
import { useT } from "@/lib/i18n/client";

type Picked = { blob: Blob; url: string; width: number; height: number };

const looksHeic = (f: File) => /hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Converts any photo the browser can read (JPEG, PNG, HEIC on iPhone/Safari) to a
 * JPEG of at most ID_TARGET_EDGE_PX on the long edge and ID_MAX_IMAGE_BYTES. Redrawing also strips
 * EXIF data such as the GPS location. */
async function convert(file: File): Promise<Picked> {
  if (file.size > ID_MAX_SOURCE_BYTES) throw new Error(msgKey("idUploadForm.photoOver20Mb"));
  let source;
  try {
    source = await decode(file);
  } catch {
    throw new Error(looksHeic(file)
      ? msgKey("idUploadForm.browserCantReadHeic")
      : msgKey("idUploadForm.photoCouldntReadUse"));
  }
  if (Math.min(source.width, source.height) < ID_MIN_EDGE_PX) throw new Error(msgKey("idUploadForm.photoTooSmallTake"));
  for (const [edge, quality] of [[ID_TARGET_EDGE_PX, 0.85], [ID_TARGET_EDGE_PX, 0.72], [1400, 0.7], [1100, 0.65]] as const) {
    const scale = Math.min(1, edge / Math.max(source.width, source.height));
    const width = Math.round(source.width * scale), height = Math.round(source.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= ID_MAX_IMAGE_BYTES) return { blob, url: URL.createObjectURL(blob), width, height };
  }
  throw new Error(msgKey("idUploadForm.photoCouldntPreparedTry"));
}

function SideSlot({ side, type, picked, onPick, onClear, busy }: { side: IdSide; type: IdDocumentType; picked?: Picked; onPick: (side: IdSide, file: File) => void; onClear: (side: IdSide) => void; busy: boolean }) {
  const t = useT();
  const camera = useRef<HTMLInputElement>(null), gallery = useRef<HTMLInputElement>(null);
  const label = t.tx(sideLabel(type, side));
  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPick(side, file);
  };
  return (
    <div className="rounded-2xl border border-line bg-[#FFFDF5] p-3" data-side={side}>
      <p className="mb-2 font-semibold">{label}</p>
      <div className="relative mb-3 flex aspect-[1.586] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gold/60 bg-white">
        {picked ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picked.url} alt={t("idUploadForm.preview", { label: label })} className="h-full w-full object-contain" />
        ) : (
          <div className="px-4 text-center text-sm text-muted">
            <div aria-hidden className="hexframe mx-auto mb-2 h-12 w-[42px] bg-gold/30" />
            {type === "PASSPORT"
              ? side === "FRONT" ? t("idUploadForm.pagePhotoNamePassport") : t("idUploadForm.notRequiredAddOnly")
              : side === "FRONT" ? t("idUploadForm.sidePhotoName") : t("idUploadForm.otherSideIdCard")}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => camera.current?.click()} className="min-h-11 rounded-full bg-gold px-3 text-sm font-semibold text-ink hover:bg-gold-dark disabled:opacity-60">
          {t("idUploadForm.takePhoto")}</button>
        <button type="button" disabled={busy} onClick={() => gallery.current?.click()} className="min-h-11 rounded-full border border-gold px-3 text-sm font-semibold text-ink hover:bg-honey disabled:opacity-60">
          {t("idUploadForm.fromGallery")}</button>
      </div>
      {picked && !backRequired(type) && side === "BACK" && (
        <button type="button" disabled={busy} onClick={() => onClear(side)} className="mt-2 text-sm font-semibold text-gold-dark underline">{t("idUploadForm.removePhoto")}</button>
      )}
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label={t("idUploadForm.takePhoto2", { label: label })} onChange={change} />
      <input ref={gallery} type="file" accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif" className="sr-only" tabIndex={-1} aria-label={t("idUploadForm.chooseFromGallery", { label: label })} onChange={change} />
    </div>
  );
}

export default function IdUploadForm({ resubmit = false, afterHref = "/verifikimi" }: { resubmit?: boolean; afterHref?: string }) {
  const t = useT();
  const router = useRouter();
  const [picked, setPicked] = useState<Partial<Record<IdSide, Picked>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [consent, setConsent] = useState(false);
  const [type, setType] = useState<IdDocumentType>("ID_CARD");
  const needBack = backRequired(type);
  const ready = !!picked.FRONT && (!needBack || !!picked.BACK);
  function clear(side: IdSide) {
    setPicked((prev) => {
      if (prev[side]) URL.revokeObjectURL(prev[side]!.url);
      const next = { ...prev };
      delete next[side];
      return next;
    });
  }
  useEffect(() => () => Object.values(picked).forEach((p) => p && URL.revokeObjectURL(p.url)), [picked]);

  async function pick(side: IdSide, file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await convert(file);
      setPicked((prev) => {
        if (prev[side]) URL.revokeObjectURL(prev[side]!.url);
        return { ...prev, [side]: result };
      });
    } catch (e) {
      setMessage({ text: e instanceof Error ? t.any(e.message) : t("idUploadForm.photoCouldntRead"), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!ready) return setMessage({ text: needBack ? t("idUploadForm.addBothSidesId") : t("idUploadForm.addPhotoPagePassport"), error: true });
    if (!consent) return setMessage({ text: t("idUploadForm.confirmConsentProcessingDocument"), error: true });
    setBusy(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.append("documentType", type);
      data.append("front", new File([picked.FRONT!.blob], "front.jpg", { type: "image/jpeg" }));
      if (picked.BACK) data.append("back", new File([picked.BACK.blob], "back.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/verifikimi", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || t("idUploadForm.uploadFailedPleaseTry"));
      setMessage({ text: result.message, error: false });
      router.replace(afterHref, { scroll: true });
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? t.any(err.message) : t("idUploadForm.uploadFailed"), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={t("idUploadForm.uploadIdentityDocument")}>
      <fieldset>
        <legend className="mb-2 font-semibold">{t("idUploadForm.whichDocumentDoHave")}</legend>
        <div className="grid grid-cols-2 gap-2" data-testid="doc-type">
          {ID_DOCUMENT_TYPES.map((dt) => (
            <label key={dt} className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border-2 px-3 py-2 ${type === dt ? "border-gold bg-honey" : "border-line bg-white"}`}>
              <span className="flex items-center gap-2 font-semibold">
                <input type="radio" name="documentType" value={dt} checked={type === dt} onChange={() => setType(dt)} className="accent-[#E0A800]" disabled={busy} />
                {t.tx(idDocumentTypeLabels[dt])}
              </span>
              <span className="pl-6 text-xs text-muted">{dt === "ID_CARD" ? t("idUploadForm.twoPhotosFrontBack") : t("idUploadForm.onePhotoPhotoPage")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["FRONT", "BACK"] as const).map((side) => <SideSlot key={side} side={side} type={type} picked={picked[side]} onPick={pick} onClear={clear} busy={busy} />)}
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
        <li>{t("idUploadForm.weOnlyAcceptValid")}</li>
        <li>{t("idUploadForm.placeDocumentFlatSurface")}</li>
        <li>{t("idUploadForm.jpegPngHeicPhoto")}</li>
      </ul>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-[#E0A800]" />
        <span>{t("idUploadForm.iAgreeZgjoiMay")}</span>
      </label>
      {message && <p role={message.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${message.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>{message.text}</p>}
      <button disabled={busy || !ready} className={`${buttonClass} w-full sm:w-auto`}>
        {busy ? t("idUploadForm.preparing") : resubmit ? t("idUploadForm.sendNewPhotos") : t("idUploadForm.sendVerification")}
      </button>
    </form>
  );
}
