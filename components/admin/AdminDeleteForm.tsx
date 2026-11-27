"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter, useT } from "@/lib/i18n/client";
import { inputClass } from "@/components/marketplace/ApiForm";

export default function AdminDeleteForm({ userId, email }: { userId: string; email: string }) {
  const t = useT();
  const router = useRouter();
  const inFlight = useRef(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const matches = typed.trim() === email;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !matches) {
      setOk(false);
      setMessage(t("adminPros.deleteTypeEmail", { email }));
      return;
    }
    inFlight.current = true;
    setPending(true);
    setMessage("");
    setOk(false);
    try {
      const response = await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "USER_DELETE", id: userId, confirmation: typed.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.message || result.error || t("apiForm.didntWorkPleaseTry"));
      setOk(true);
      setMessage(result.message || t("apiForm.done"));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("apiForm.connectionFailedFormSaved"));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 border-t border-line pt-4" data-testid="admin-delete-profile" aria-busy={pending}>
      <h3 className="font-bold text-red-800">{t("adminPros.deleteTitle")}</h3>
      <p className="text-sm text-muted">{t("adminPros.deleteIntro")}</p>
      <label className="block text-sm font-semibold">
        {t("adminPros.deleteConfirmLabel", { email })}
        <input type="text" name="confirmation" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={`${inputClass} mt-1`} placeholder={email} />
      </label>
      {message && <p role={ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm ${ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>{message}</p>}
      <button type="submit" disabled={pending || !matches} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? t("apiForm.processing") : t("adminPros.delete")}
      </button>
    </form>
  );
}
