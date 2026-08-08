import type { Metadata } from "next";
import { AlertTriangle, Download } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, StatCard, SectionTitle } from "@/components/account/Bits";
import { adminNav } from "@/lib/nav";
import { transactions } from "@/lib/admin";
import { KOMISIONI } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Transaksionet — Admin Zgjoi" };

const admin = { name: "Rrustem Gashi", initials: "RG", hue: 38, caption: "Administrator" };

const stateStyle: Record<string, string> = {
  "e-bllokuar": "bg-[#FFF3CF] text-[#8a6100]",
  "e-liruar": "bg-[#E9F7EC] text-[#1F7A3A]",
  "e-rimbursuar": "bg-[#F3F1EE] text-muted",
  "në-kontest": "bg-[#FDF0F0] text-[#B4232A]",
};

const stateLabel: Record<string, string> = {
  "e-bllokuar": "E bllokuar",
  "e-liruar": "E liruar",
  "e-rimbursuar": "E rimbursuar",
  "në-kontest": "Në kontest",
};

export default function AdminTransactionsPage() {
  const held = transactions.filter((t) => t.state === "e-bllokuar").reduce((s, t) => s + t.gross, 0);
  const released = transactions.filter((t) => t.state === "e-liruar").reduce((s, t) => s + t.gross, 0);
  const disputes = transactions.filter((t) => t.state === "në-kontest").length;

  return (
    <AccountShell
      title="Transaksionet dhe kontestet"
      subtitle="Regjistri i plotë financiar: bllokime, lirime, rimbursime dhe konteste."
      nav={adminNav}
      user={admin}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Të bllokuara" value={`${held}€`} hint="në escrow tani" />
        <StatCard label="Të liruara" value={`${released}€`} hint="7 ditët e fundit" />
        <StatCard label="Komisioni" value={`${Math.round((released * KOMISIONI) / 100)}€`} hint={`${KOMISIONI}% e vlerës`} />
        <StatCard label="Konteste të hapura" value={String(disputes)} hint="kërkojnë ndërhyrje" />
      </div>

      <div className="mt-8">
        <SectionTitle
          action={
            <button className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted hover:border-gold hover:text-gold-dark">
              <Download size={15} /> Eksporto CSV
            </button>
          }
        >
          Regjistri
        </SectionTitle>

        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-4 font-semibold">ID</th>
                  <th className="px-5 py-4 font-semibold">Data</th>
                  <th className="px-5 py-4 font-semibold">Puna</th>
                  <th className="px-5 py-4 font-semibold">Klienti → Profesionisti</th>
                  <th className="px-5 py-4 font-semibold">Vlera</th>
                  <th className="px-5 py-4 font-semibold">Komisioni</th>
                  <th className="px-5 py-4 font-semibold">Statusi</th>
                  <th className="px-5 py-4 font-semibold">Veprim</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-4 font-mono text-xs text-muted">{t.id}</td>
                    <td className="px-5 py-4 text-muted">{t.date}</td>
                    <td className="px-5 py-4 font-bold text-ink">{t.job}</td>
                    <td className="px-5 py-4 text-muted">
                      {t.client} → {t.pro}
                    </td>
                    <td className="px-5 py-4 font-bold text-ink">{t.gross}€</td>
                    <td className="px-5 py-4 text-muted">
                      {Math.round((t.gross * KOMISIONI) / 100)}€
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${stateStyle[t.state]}`}>
                        {stateLabel[t.state]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-gold hover:text-gold-dark">
                        {t.state === "në-kontest" ? "Zgjidh" : "Rimburso"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="mt-6 !border-[#F0C9CB]">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#B4232A]" />
          <div>
            <h3 className="text-sm font-extrabold text-ink">
              Kontest i hapur: Montim mobiljesh (t-898)
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Klienti Arta S. pretendon se çmimi ndryshoi pas përfundimit të
              punës. Shuma prej 85€ mbetet e bllokuar derisa të merret vendimi.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-full bg-gold px-5 py-2 text-xs font-bold text-ink hover:bg-gold-dark">
                Liro te profesionisti
              </button>
              <button className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted hover:border-ink hover:text-ink">
                Rimburso klientin
              </button>
              <button className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted hover:border-gold hover:text-gold-dark">
                Kërko dëshmi
              </button>
            </div>
          </div>
        </div>
      </Card>
    </AccountShell>
  );
}
