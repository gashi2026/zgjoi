import type { Metadata } from "next";
import AccountShell from "@/components/AccountShell";
import { Card, Badge, DemoNote } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { proSummary, proJobs } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Punët — Zgjoi për profesionistë" };

export default function ProJobsPage() {
  return (
    <AccountShell
      title="Punët e mia"
      subtitle="Të gjitha punët e pranuara, në vazhdim dhe të përfunduara."
      nav={proNav}
      user={{
        name: proSummary.name,
        initials: proSummary.initials,
        hue: proSummary.hue,
        caption: `${proSummary.profession} · ${proSummary.city}`,
      }}
    >
      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-4 font-semibold">Shërbimi</th>
                <th className="px-5 py-4 font-semibold">Klienti</th>
                <th className="px-5 py-4 font-semibold">Data</th>
                <th className="px-5 py-4 font-semibold">Vlera</th>
                <th className="px-5 py-4 font-semibold">Pagesa</th>
                <th className="px-5 py-4 font-semibold">Statusi</th>
              </tr>
            </thead>
            <tbody>
              {proJobs.map((j) => (
                <tr key={j.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4 font-bold text-ink">{j.service}</td>
                  <td className="px-5 py-4 text-muted">{j.client}</td>
                  <td className="px-5 py-4 text-muted">{j.date}</td>
                  <td className="px-5 py-4 font-bold text-ink">{j.amount}€</td>
                  <td className="px-5 py-4 text-muted">
                    {j.payout === "e-bllokuar"
                      ? "E bllokuar"
                      : j.payout === "e-liruar"
                      ? "E liruar"
                      : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <Badge status={j.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <DemoNote />
    </AccountShell>
  );
}
