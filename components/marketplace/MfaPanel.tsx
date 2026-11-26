"use client";
import Link from "next/link";
import { useId, useState } from "react";

type Result = { ok?: boolean; enabled?: boolean; secret?: string; recoveryCodes?: string[]; reauthenticate?: boolean; message?: string };
export default function MfaPanel({ enabled, recoveryCodesRemaining, staff }: {
  enabled: boolean; recoveryCodesRemaining: number; staff: boolean;
}) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(action: "BEGIN" | "ENABLE" | "DISABLE" | "REGENERATE") {
    if (busy) return;
    if (action === "DISABLE" && !window.confirm("Dëshironi të çaktivizoni autentikimin me dy hapa? Hyrjet aktive do të mbyllen.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/account/mfa", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, currentPassword: password, code }) });
      const next: Result = await response.json();
      if (!response.ok) throw new Error(next.message || "Veprimi nuk u përfundua.");
      setResult(next); setCode("");
      if (next.reauthenticate) setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "Provoni përsëri."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="text-lg font-bold">Autentikimi me dy hapa</h2>
    <p className="mt-2 text-sm text-muted">Mbroni hyrjen me një kod nga aplikacioni juaj i autentikimit. {staff ? "Aktivizojeni për llogarinë e stafit para hapjes së platformës." : "Kodi kërkohet krahas fjalëkalimit në çdo hyrje të re."}</p>
    <p className="mt-3 text-sm font-semibold">{enabled ? `Aktiv · ${recoveryCodesRemaining} kode rikuperimi të papërdorura` : "Ende jo aktiv"}</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {result.message && <p role="status" className="mt-3 text-sm">{result.message}</p>}
    {result.reauthenticate ? <>
      {result.recoveryCodes && <div className="mt-4 rounded-xl border border-line bg-cream p-4">
        <h3 className="font-bold">Ruani kodet e rikuperimit tani</h3>
        <p className="mt-2 text-sm">Shfaqen vetëm këtë herë. Secili përdoret një herë bashkë me fjalëkalimin. Ruajini në një vend privat, veç pajisjes së autentikimit.</p>
        <ul className="mt-3 space-y-2 font-mono text-xs break-all">{result.recoveryCodes.map(value => <li key={value}>{value}</li>)}</ul>
      </div>}
      <Link href="/hyr" className="mt-4 inline-block rounded-full bg-gold px-5 py-3 font-semibold">Hyr përsëri</Link>
    </> : <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); void submit(result.secret ? "ENABLE" : enabled ? "REGENERATE" : "BEGIN"); }}>
      <label className="block text-sm font-semibold" htmlFor={`${id}-password`}>Fjalëkalimi aktual
        <input id={`${id}-password`} type="password" autoComplete="current-password" required maxLength={256} value={password}
          onChange={event => setPassword(event.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-line p-3" />
      </label>
      {result.secret && <div className="rounded-xl border border-line bg-cream p-4">
        <p className="text-sm">Në aplikacionin e autentikimit zgjidhni shtim manual: emri Zgjoi, lloji sipas kohës, 6 shifra çdo 30 sekonda.</p>
        <p className="mt-3 break-all font-mono text-sm" aria-label="Çelësi i konfigurimit">{result.secret}</p>
        <p className="mt-2 text-sm">Mos e ndani këtë çelës me askënd. Shkruani kodin që shfaq aplikacioni.</p>
      </div>}
      {(enabled || result.secret) && <label className="block text-sm font-semibold" htmlFor={`${id}-code`}>Kodi i autentikimit{enabled ? " ose i rikuperimit" : ""}
        <input id={`${id}-code`} autoComplete="one-time-code" required maxLength={50} value={code}
          onChange={event => setCode(event.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-line p-3" />
      </label>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="rounded-full bg-gold px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Duke përpunuar…" : result.secret ? "Konfirmo aktivizimin" : enabled ? "Gjenero kode të reja rikuperimi" : "Fillo aktivizimin"}</button>
        {enabled && <button type="button" disabled={busy || !password || !code} onClick={() => void submit("DISABLE")} className="rounded-full border border-line px-5 py-3 text-sm disabled:opacity-50">Çaktivizo dy hapat</button>}
      </div>
    </form>}
  </section>;
}
