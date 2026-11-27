"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter, useT } from "@/lib/i18n/client";
import { buttonClass, inputClass } from "@/components/marketplace/ApiForm";
import type { SuspendDuration } from "@/lib/suspension";

const DURATIONS: SuspendDuration[] = ["1d", "7d", "30d", "permanent", "until"];

export default function AdminSuspendForm({
  userId,
  suspended,
  until,
  reason,
  statusLabel,
}: {
  userId: string;
  suspended: boolean;
  until: string | null;
  reason: string | null;
  statusLabel: string;
}) {
  const t = useT();
  const router = useRouter();
  const inFlight = useRef(false);
  const [duration, setDuration] = useState<SuspendDuration>("7d");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function post(body: Record<string, unknown>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setMessage("");
    setOk(false);
    try {
      const response = await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void post({
      action: "USER_SUSPEND",
      id: userId,
      duration,
      untilDate: duration === "until" ? String(data.get("untilDate") ?? "") : undefined,
      reason: String(data.get("reason") ?? "").trim() || undefined,
    });
  }

  return (
    <div className="space-y-3" data-testid="admin-suspend">
      {suspended && (
        <div className="rounded-xl bg-[#FFF9E3] p-3 text-sm">
          <p className="font-semibold">{statusLabel}</p>
          {reason && <p className="mt-1 text-muted">{t("adminPros.suspensionReason", { reason })}</p>}
          <button type="button" disabled={pending} className={`${buttonClass} mt-3`} onClick={() => void post({ action: "USER_RESTORE", id: userId })} data-testid="admin-unsuspend">
            {pending ? t("apiForm.processing") : t("adminPros.unsuspend")}
          </button>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3" aria-busy={pending}>
        <h3 className="font-bold">{suspended ? t("adminPros.changeSuspension") : t("adminPros.suspendTitle")}</h3>
        <fieldset>
          <legend className="text-sm font-semibold">{t("adminPros.duration")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map((value) => (
              <label key={value} className={`cursor-pointer rounded-full border px-3 py-2 text-sm ${duration === value ? "border-gold bg-honey font-semibold" : "border-line hover:border-gold"}`}>
                <input type="radio" name="duration" value={value} checked={duration === value} onChange={() => setDuration(value)} className="sr-only" />
                {t(`adminPros.${value}` as "adminPros.1d")}
              </label>
            ))}
          </div>
        </fieldset>
        {duration === "until" && (
          <label className="block text-sm font-semibold">
            {t("adminPros.untilDate")} *
            <input type="date" name="untilDate" required className={`${inputClass} mt-1`} />
          </label>
        )}
        <label className="block text-sm font-semibold">
          {t("adminPros.reasonOptional")}
          <textarea name="reason" maxLength={1000} rows={2} className={`${inputClass} mt-1`} />
        </label>
        {message && <p role={ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm ${ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>{message}</p>}
        <button type="submit" disabled={pending} className={buttonClass}>{pending ? t("apiForm.processing") : t("adminPros.suspend")}</button>
      </form>
    </div>
  );
}
