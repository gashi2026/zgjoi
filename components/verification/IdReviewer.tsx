"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass } from "@/components/marketplace/ApiForm";
import { ID_DECLINE_REASONS, idSideLabels, type IdDeclineReason, type IdSide } from "@/lib/id-verification";

function Zoomable({ src, label }: { src: string; label: string }) {
  const [open, setOpen] = useState(false), [zoom, setZoom] = useState(1), [rotate, setRotate] = useState(0);
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-sm font-semibold">{label}</figcaption>
      <button type="button" onClick={() => setOpen(true)} className="block w-full overflow-hidden rounded-xl border-2 border-gold/50 bg-ink/5" aria-label={`Zmadho: ${label}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="aspect-[1.586] w-full object-contain" referrerPolicy="no-referrer" />
      </button>
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[1000] flex flex-col bg-neutral-950">
          <div className="flex flex-wrap items-center gap-2 p-3 text-white">
            <span className="mr-auto font-semibold">{label}</span>
            <button type="button" className="min-h-11 rounded-full bg-white/15 px-4" onClick={() => setZoom(z => Math.max(1, z - 0.5))}>−</button>
            <span className="w-14 text-center text-sm">{Math.round(zoom * 100)}%</span>
            <button type="button" className="min-h-11 rounded-full bg-white/15 px-4" onClick={() => setZoom(z => Math.min(5, z + 0.5))}>+</button>
            <button type="button" className="min-h-11 rounded-full bg-white/15 px-4" onClick={() => setRotate(r => (r + 90) % 360)}>↻ Rrotullo</button>
            <button type="button" className="min-h-11 rounded-full bg-gold px-4 font-semibold text-ink" onClick={() => { setOpen(false); setZoom(1); setRotate(0); }}>Mbyll</button>
          </div>
          <div className="flex-1 overflow-auto" onWheel={(e) => setZoom(z => Math.min(5, Math.max(1, z - Math.sign(e.deltaY) * 0.25)))}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={label} referrerPolicy="no-referrer" className="mx-auto max-w-none origin-top transition-transform"
              style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? "100%" : "none", transform: `rotate(${rotate}deg)` }} />
          </div>
        </div>,
        document.body,
      )}
    </figure>
  );
}

export function IdImages({ id, sides }: { id: string; sides: IdSide[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(["FRONT", "BACK"] as const).map((side) => sides.includes(side)
        ? <Zoomable key={side} src={`/api/admin/verifikimi/${id}/${side}`} label={idSideLabels[side]} />
        : <p key={side} className="rounded-xl border border-dashed p-6 text-center text-sm text-muted">{idSideLabels[side]}: mungon / është fshirë</p>)}
    </div>
  );
}

export function IdDecision({ id, nextHref }: { id: string; nextHref: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "decline">("idle");
  const [reason, setReason] = useState<IdDeclineReason>("BLURRY");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function send(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/verifikimi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Veprimi nuk u krye.");
      router.push(nextHref);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Veprimi nuk u krye.");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => window.confirm("Miratoni këtë dokument identifikimi?") && send({ decision: "APPROVE" })}
            className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">✓ Mirato</button>
          <button type="button" disabled={busy} onClick={() => setMode("decline")}
            className="inline-flex min-h-11 items-center rounded-full border-2 border-red-600 px-6 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">✕ Refuzo…</button>
        </div>
      ) : (
        <form className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-3" onSubmit={(e) => { e.preventDefault(); send({ decision: "DECLINE", reason, note: note.trim() || undefined }); }}>
          <fieldset>
            <legend className="mb-2 font-semibold">Arsyeja e refuzimit (e sheh përdoruesi)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(ID_DECLINE_REASONS) as IdDeclineReason[]).map((key) => (
                <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm ${reason === key ? "border-red-500 ring-1 ring-red-400" : "border-line"}`}>
                  <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} className="accent-red-600" />
                  {ID_DECLINE_REASONS[key]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            {reason === "OTHER" ? "Shkruani arsyen (e detyrueshme)" : "Shënim shtesë për përdoruesin (opsionale)"}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} required={reason === "OTHER"} minLength={reason === "OTHER" ? 5 : undefined} className={`${inputClass} mt-1`} />
          </label>
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-6 font-semibold text-white hover:bg-red-700 disabled:opacity-60">Refuzo dhe njofto</button>
            <button type="button" disabled={busy} onClick={() => setMode("idle")} className={buttonClass.replace("bg-gold", "bg-white border border-line")}>Anulo</button>
          </div>
        </form>
      )}
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    </div>
  );
}
