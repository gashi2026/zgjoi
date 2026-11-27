"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/lib/i18n/client";
import { buttonClass, inputClass } from "@/components/marketplace/ApiForm";
import { ID_DECLINE_REASONS, ID_DOCUMENT_TYPES, idDocumentTypeLabels, sideLabel, type IdDeclineReason, type IdDocumentType, type IdSide } from "@/lib/id-verification";
import { useT } from "@/lib/i18n/client";

function Zoomable({ src, label }: { src: string; label: string }) {
  const t = useT();
  const [open, setOpen] = useState(false), [zoom, setZoom] = useState(1), [rotate, setRotate] = useState(0);
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-sm font-semibold">{label}</figcaption>
      <button type="button" onClick={() => setOpen(true)} className="block w-full overflow-hidden rounded-xl border-2 border-gold/50 bg-ink/5" aria-label={t("idReviewer.zoom", { label: label })}>
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
            <button type="button" className="min-h-11 rounded-full bg-white/15 px-4" onClick={() => setRotate(r => (r + 90) % 360)}>{t("idReviewer.rotate")}</button>
            <button type="button" className="min-h-11 rounded-full bg-gold px-4 font-semibold text-ink" onClick={() => { setOpen(false); setZoom(1); setRotate(0); }}>{t("idReviewer.close")}</button>
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

export function IdImages({ id, sides, documentType = "ID_CARD", deleted = false }: { id: string; sides: IdSide[]; documentType?: IdDocumentType; deleted?: boolean }) {
  const t = useT();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(["FRONT", "BACK"] as const).map((side) => sides.includes(side)
        ? <Zoomable key={side} src={`/api/admin/verifikimi/${id}/${side}`} label={t.tx(sideLabel(documentType, side))} />
        : <p key={side} className="flex items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted">
            {t.tx(sideLabel(documentType, side))}: {deleted ? t("idReviewer.deletedAfterRetentionPeriod") : documentType === "PASSPORT" && side === "BACK" ? t("idReviewer.notUploadedOptionalPassports") : "mungon"}
          </p>)}
    </div>
  );
}

export function IdDecision({ id, nextHref, accountName, documentType }: { id: string; nextHref: string; accountName: string; documentType: IdDocumentType }) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "decline" | "approve">("idle");
  const [rec, setRec] = useState({ legalName: accountName, birthDate: "", documentType, documentNumber: "", issuingCountry: documentType === "ID_CARD" ? t("idReviewer.kosovo") : "", expiresOn: "" });
  const field = (k: keyof typeof rec) => ({ value: rec[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setRec((r) => ({ ...r, [k]: e.target.value })) });
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
      if (!response.ok) throw new Error(result.message || t("idReviewer.actionWasntCompleted"));
      router.push(nextHref);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("idReviewer.actionWasntCompleted"));
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => setMode("approve")}
            className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{t("idReviewer.approve")}</button>
          <button type="button" disabled={busy} onClick={() => setMode("decline")}
            className="inline-flex min-h-11 items-center rounded-full border-2 border-red-600 px-6 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">{t("idReviewer.decline")}</button>
        </div>
      ) : mode === "approve" ? (
        <form data-testid="identity-record-form" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3"
          onSubmit={(e) => { e.preventDefault(); send({ decision: "APPROVE", ...rec }); }}>
          <p className="font-semibold">{t("idReviewer.identityRecordCopyFrom")}</p>
          <p className="text-xs text-muted">{t("idReviewer.keptPermanentlyLegalSafety")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">{t("idReviewer.fullLegalNameDocument")}<input required minLength={2} maxLength={120} className={`${inputClass} mt-1`} {...field("legalName")} /></label>
            <label className="block text-sm">{t("idReviewer.dateBirth")}<input required type="date" className={`${inputClass} mt-1`} {...field("birthDate")} /></label>
            <label className="block text-sm">{t("idReviewer.documentType")}<select className={`${inputClass} mt-1`} {...field("documentType")}>
                {ID_DOCUMENT_TYPES.map((dt) => <option key={dt} value={dt}>{t.tx(idDocumentTypeLabels[dt])}</option>)}
              </select></label>
            <label className="block text-sm">{t("idReviewer.documentNumber")}<input required minLength={4} maxLength={40} autoComplete="off" className={`${inputClass} mt-1 uppercase`} {...field("documentNumber")} /></label>
            <label className="block text-sm">{t("idReviewer.issuingCountry")}<input required minLength={2} maxLength={60} className={`${inputClass} mt-1`} {...field("issuingCountry")} /></label>
            <label className="block text-sm">{t("idReviewer.validUntil")}<input required type="date" className={`${inputClass} mt-1`} {...field("expiresOn")} /></label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{t("idReviewer.approveSaveRecord")}</button>
            <button type="button" disabled={busy} onClick={() => setMode("idle")} className={buttonClass.replace("bg-gold", "bg-white border border-line")}>{t("idReviewer.cancel")}</button>
          </div>
        </form>
      ) : (
        <form className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-3" onSubmit={(e) => { e.preventDefault(); send({ decision: "DECLINE", reason, note: note.trim() || undefined }); }}>
          <fieldset>
            <legend className="mb-2 font-semibold">{t("idReviewer.reasonDecliningShownUser")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(ID_DECLINE_REASONS) as IdDeclineReason[]).map((key) => (
                <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm ${reason === key ? "border-red-500 ring-1 ring-red-400" : "border-line"}`}>
                  <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} className="accent-red-600" />
                  {t.tx(ID_DECLINE_REASONS[key])}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            {reason === "OTHER" ? t("idReviewer.writeReasonRequired") : t("idReviewer.extraNoteUserOptional")}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} required={reason === "OTHER"} minLength={reason === "OTHER" ? 5 : undefined} className={`${inputClass} mt-1`} />
          </label>
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-6 font-semibold text-white hover:bg-red-700 disabled:opacity-60">{t("idReviewer.declineNotify")}</button>
            <button type="button" disabled={busy} onClick={() => setMode("idle")} className={buttonClass.replace("bg-gold", "bg-white border border-line")}>{t("idReviewer.cancel")}</button>
          </div>
        </form>
      )}
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    </div>
  );
}

/** ADMIN-only switch: grant or revoke ID review for one SUPPORT user (takes effect immediately). */
export function ReviewPermissionToggle({ userId, name, granted }: { userId: string; name: string; granted: boolean }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function toggle() {
    const grant = !granted;
    if (!window.confirm(grant ? t("idReviewer.givePermissionViewDecide", { name: name }) : t("idReviewer.removeSPermissionIdentity", { name: name }))) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/verifikimi/leja", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, grant }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || t("idReviewer.actionWasntCompleted"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("idReviewer.actionWasntCompleted"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" role="switch" aria-checked={granted} aria-label={t("idReviewer.idPermission", { name: name })} disabled={busy} onClick={toggle}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${granted ? "bg-emerald-600" : "bg-neutral-300"}`}>
        <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${granted ? "translate-x-7" : "translate-x-1"}`} />
      </button>
      <span className="w-16 text-sm font-semibold">{granted ? t("idReviewer.allowed") : t("idReviewer.noPermission")}</span>
      {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
    </span>
  );
}
