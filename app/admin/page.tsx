import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, TrendingUp } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, StatCard, SectionTitle } from "@/components/account/Bits";
import { adminNav } from "@/lib/nav";
import { adminStats, growth, pendingVerifications, transactions } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin — Zgjoi" };

const admin = {
  name: "Rrustem Gashi",
  initials: "RG",
  hue: 38,
  caption: "Administrator",
};

export default function AdminDashboard() {
  const max = Math.max(...growth.map((g) => g.volume));

  return (
    <AccountShell
      title="Paneli i administrimit"
      subtitle="Vëllimi i tregut, rritja e përdoruesve dhe çka pret veprim."
      nav={adminNav}
      user={admin}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adminStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <TrendingUp size={18} className="text-gold-dark" /> Vëllimi mujor
            </span>
          </SectionTitle>
          <div className="flex h-52 items-end gap-3">
            {growth.map((g) => (
              <div key={g.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-bold text-ink">
                  {(g.volume / 1000).toFixed(1)}k
                </span>
                <div
                  className="w-full rounded-t-lg bg-gold transition-all"
                  style={{ height: `${(g.volume / max) * 100}%` }}
                />
                <span className="text-xs text-muted">{g.month}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
            Rritje prej <b className="text-ink">12.8%</b> krahasuar me muajin e
            kaluar. Përdoruesit aktivë: <b className="text-ink">12,480</b>.
          </p>
        </Card>

        <div>
          <SectionTitle
            action={
              <Link href="/admin/perdoruesit" className="flex items-center gap-1 text-sm font-semibold text-gold-dark">
                Të gjitha <ArrowRight size={15} />
              </Link>
            }
          >
            Verifikime në pritje
          </SectionTitle>
          <div className="space-y-3">
            {pendingVerifications.map((v) => (
              <Card key={v.name}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{v.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {v.category} · {v.city} · {v.docs}
                    </p>
                  </div>
                  <span className="rounded-full bg-honey px-3 py-1 text-xs font-bold text-gold-dark">
                    {v.waiting}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-dark">
                    <ShieldCheck size={13} /> Aprovo
                  </button>
                  <button className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted hover:border-ink hover:text-ink">
                    Refuzo
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle
          action={
            <Link href="/admin/transaksionet" className="flex items-center gap-1 text-sm font-semibold text-gold-dark">
              Regjistri i plotë <ArrowRight size={15} />
            </Link>
          }
        >
          Transaksionet e fundit
        </SectionTitle>
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-4 font-semibold">Data</th>
                  <th className="px-5 py-4 font-semibold">Puna</th>
                  <th className="px-5 py-4 font-semibold">Klienti</th>
                  <th className="px-5 py-4 font-semibold">Profesionisti</th>
                  <th className="px-5 py-4 font-semibold">Vlera</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 4).map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-4 text-muted">{t.date}</td>
                    <td className="px-5 py-4 font-bold text-ink">{t.job}</td>
                    <td className="px-5 py-4 text-muted">{t.client}</td>
                    <td className="px-5 py-4 text-muted">{t.pro}</td>
                    <td className="px-5 py-4 font-bold text-ink">{t.gross}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AccountShell>
  );
}
