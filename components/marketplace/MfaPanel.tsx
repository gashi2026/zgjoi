"use client";
import Link from "@/components/i18n/Link";
import { useId, useState } from "react";
import { useT } from "@/lib/i18n/client";

type Result = { ok?: boolean; enabled?: boolean; secret?: string; recoveryCodes?: string[]; reauthenticate?: boolean; message?: string };
export default function MfaPanel({ enabled, recoveryCodesRemaining, staff }: {
  enabled: boolean; recoveryCodesRemaining: number; staff: boolean;
}) {
  const t = useT();
  const id = useId();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(action: "BEGIN" | "ENABLE" | "DISABLE" | "REGENERATE") {
    if (busy) return;
    if (action === "DISABLE" && !window.confirm(t("mfaPanel.turnOffTwoStep"))) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/account/mfa", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, currentPassword: password, code }) });
      const next: Result = await response.json();
      if (!response.ok) throw new Error(next.message || t("mfaPanel.actionWasntCompleted"));
      setResult(next); setCode("");
      if (next.reauthenticate) setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : t("mfaPanel.pleaseTryAgain")); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="text-lg font-bold">{t("mfaPanel.twoStepSign")}</h2>
    <p className="mt-2 text-sm text-muted">{t("mfaPanel.protectLoginCodeFrom")}{" "}{staff ? t("mfaPanel.turnStaffAccountsBefore") : t("mfaPanel.codeRequiredAlongPassword")}</p>
    <p className="mt-3 text-sm font-semibold">{enabled ? t("mfaPanel.unusedRecoveryCodes", { recoveryCodesRemaining: recoveryCodesRemaining }) : t("mfaPanel.notYet")}</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {result.message && <p role="status" className="mt-3 text-sm">{result.message}</p>}
    {result.reauthenticate ? <>
      {result.recoveryCodes && <div className="mt-4 rounded-xl border border-line bg-cream p-4">
        <h3 className="font-bold">{t("mfaPanel.saveRecoveryCodesNow")}</h3>
        <p className="mt-2 text-sm">{t("mfaPanel.theyreShownOnlyOnce")}</p>
        <ul className="mt-3 space-y-2 font-mono text-xs break-all">{result.recoveryCodes.map(value => <li key={value}>{value}</li>)}</ul>
      </div>}
      <Link href="/hyr" className="mt-4 inline-block rounded-full bg-gold px-5 py-3 font-semibold">{t("mfaPanel.logAgain")}</Link>
    </> : <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); void submit(result.secret ? "ENABLE" : enabled ? "REGENERATE" : "BEGIN"); }}>
      <label className="block text-sm font-semibold" htmlFor={`${id}-password`}>{t("mfaPanel.currentPassword")}<input id={`${id}-password`} type="password" autoComplete="current-password" required maxLength={256} value={password}
          onChange={event => setPassword(event.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-line p-3" />
      </label>
      {result.secret && <div className="rounded-xl border border-line bg-cream p-4">
        <p className="text-sm">{t("mfaPanel.authenticatorAppChooseManual")}</p>
        <p className="mt-3 break-all font-mono text-sm" aria-label={t("mfaPanel.setupKey")}>{result.secret}</p>
        <p className="mt-2 text-sm">{t("mfaPanel.dontShareKeyAnyone")}</p>
      </div>}
      {(enabled || result.secret) && <label className="block text-sm font-semibold" htmlFor={`${id}-code`}>{t("mfaPanel.authenticationCode")}{enabled ? t("mfaPanel.recoveryCode") : ""}
        <input id={`${id}-code`} autoComplete="one-time-code" required maxLength={50} value={code}
          onChange={event => setCode(event.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-line p-3" />
      </label>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="rounded-full bg-gold px-5 py-3 font-semibold disabled:opacity-50">{busy ? t("mfaPanel.processing") : result.secret ? t("mfaPanel.confirmTurn") : enabled ? t("mfaPanel.generateNewRecoveryCodes") : t("mfaPanel.startSetup")}</button>
        {enabled && <button type="button" disabled={busy || !password || !code} onClick={() => void submit("DISABLE")} className="rounded-full border border-line px-5 py-3 text-sm disabled:opacity-50">{t("mfaPanel.turnOffTwoStep2")}</button>}
      </div>
    </form>}
  </section>;
}
