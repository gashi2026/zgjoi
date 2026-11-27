"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "@/lib/i18n/client";
import { buttonClass, inputClass } from "./ApiForm";
import { useT } from "@/lib/i18n/client";
export default function UploadDocument() {
  const t = useT();
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setPending(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || t("uploadDocument.uploadFailed"));
      setMessage(t("uploadDocument.documentWasSavedPrivately"));
      form.reset();
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : t("uploadDocument.uploadFailedPleaseTry"),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted">
        {t("uploadDocument.idCardUploadedUnder")}{" "}<a className="font-semibold text-gold-dark underline" href="/verifikimi">{t("uploadDocument.idVerification")}</a>.
      </p>
      <label className="block text-sm">
        {t("uploadDocument.type")}<select name="kind" className={inputClass}>
          <option value="CERTIFICATE">{t("uploadDocument.certificate")}</option>
          <option value="INSURANCE">{t("uploadDocument.insurance")}</option>
        </select>
      </label>
      <label className="block text-sm">
        {t("uploadDocument.documentPdfPngJpeg")}<input
          type="file"
          name="file"
          required
          accept="application/pdf,image/png,image/jpeg"
          className={`${inputClass} mt-1`}
        />
      </label>
      <p role="status" className="text-sm">
        {message}
      </p>
      <button disabled={pending} className={buttonClass}>
        {pending ? t("uploadDocument.loading") : t("uploadDocument.uploadPrivately")}
      </button>
    </form>
  );
}
