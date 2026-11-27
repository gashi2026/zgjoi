"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/marketplace/ApiForm";
import { ID_MAX_IMAGE_BYTES, ID_MAX_SOURCE_BYTES, ID_MIN_EDGE_PX, ID_TARGET_EDGE_PX, idSideLabels, type IdSide } from "@/lib/id-verification";

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
  if (file.size > ID_MAX_SOURCE_BYTES) throw new Error("Fotoja është mbi 20 MB. Zgjidhni një foto më të vogël.");
  let source;
  try {
    source = await decode(file);
  } catch {
    throw new Error(looksHeic(file)
      ? "Ky shfletues nuk e lexon formatin HEIC. Bëni foto direkt me “Bëj foto”, ose në iPhone: Cilësimet › Kamera › Formatet › “Më e përputhshme”."
      : "Fotoja nuk u lexua. Përdorni JPEG, PNG ose HEIC.");
  }
  if (Math.min(source.width, source.height) < ID_MIN_EDGE_PX) throw new Error("Fotoja është shumë e vogël. Fotografoni dokumentin më nga afër.");
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
  throw new Error("Fotoja nuk u përgatit. Provoni një foto tjetër.");
}

function SideSlot({ side, picked, onPick, busy }: { side: IdSide; picked?: Picked; onPick: (side: IdSide, file: File) => void; busy: boolean }) {
  const camera = useRef<HTMLInputElement>(null), gallery = useRef<HTMLInputElement>(null);
  const label = idSideLabels[side];
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
          <img src={picked.url} alt={`Parapamje: ${label}`} className="h-full w-full object-contain" />
        ) : (
          <div className="px-4 text-center text-sm text-muted">
            <div aria-hidden className="hexframe mx-auto mb-2 h-12 w-[42px] bg-gold/30" />
            {side === "FRONT" ? "Ana me foton dhe emrin tuaj" : "Ana tjetër e dokumentit"}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => camera.current?.click()} className="min-h-11 rounded-full bg-gold px-3 text-sm font-semibold text-ink hover:bg-gold-dark disabled:opacity-60">
          📷 Bëj foto
        </button>
        <button type="button" disabled={busy} onClick={() => gallery.current?.click()} className="min-h-11 rounded-full border border-gold px-3 text-sm font-semibold text-ink hover:bg-honey disabled:opacity-60">
          Nga galeria
        </button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label={`${label}: bëj foto`} onChange={change} />
      <input ref={gallery} type="file" accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif" className="sr-only" tabIndex={-1} aria-label={`${label}: zgjidh nga galeria`} onChange={change} />
    </div>
  );
}

export default function IdUploadForm({ resubmit = false }: { resubmit?: boolean }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Partial<Record<IdSide, Picked>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [consent, setConsent] = useState(false);
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
      setMessage({ text: e instanceof Error ? e.message : "Fotoja nuk u lexua.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!picked.FRONT || !picked.BACK) return setMessage({ text: "Shtoni të dyja anët e dokumentit.", error: true });
    if (!consent) return setMessage({ text: "Konfirmoni pëlqimin për përpunimin e dokumentit.", error: true });
    setBusy(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.append("front", new File([picked.FRONT.blob], "front.jpg", { type: "image/jpeg" }));
      data.append("back", new File([picked.BACK.blob], "back.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/verifikimi", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Ngarkimi dështoi. Provoni përsëri.");
      setMessage({ text: result.message, error: false });
      router.replace("/verifikimi", { scroll: true });
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Ngarkimi dështoi.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Ngarko dokumentin e identifikimit">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["FRONT", "BACK"] as const).map((side) => <SideSlot key={side} side={side} picked={picked[side]} onPick={pick} busy={busy} />)}
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Letërnjoftim, pasaportë ose patentë shoferi e vlefshme.</li>
        <li>Vendoseni dokumentin në sipërfaqe të sheshtë, me dritë të mirë dhe pa reflektim; të katër skajet duhet të duken.</li>
        <li>JPEG, PNG ose HEIC. Fotoja zvogëlohet automatikisht në telefonin tuaj para dërgimit.</li>
      </ul>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-[#E0A800]" />
        <span>Pajtohem që Zgjoi të përpunojë fotot e dokumentit vetëm për verifikimin e identitetit, sipas shënimit të privatësisë më poshtë.</span>
      </label>
      {message && <p role={message.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${message.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>{message.text}</p>}
      <button disabled={busy || !picked.FRONT || !picked.BACK} className={`${buttonClass} w-full sm:w-auto`}>
        {busy ? "Duke përgatitur…" : resubmit ? "Dërgo fotot e reja" : "Dërgo për verifikim"}
      </button>
    </form>
  );
}
