import type { Metadata } from "next";
import { Landmark, ShieldCheck } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, StatCard, SectionTitle, DemoNote } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { proSummary, payouts, KOMISIONI } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Të ardhurat — Zgjoi për profesionistë" };

const net = (gross: number) => Math.round(gross * (1 - KOMISIONI / 100));

export default function ProEarnings() {
  const released = payouts.filter((p) => p.status === "e-liruar");
  const totalGross = released.reduce((s, p) => s + p.gross, 0);
  const totalNet = released.reduce((s, p) => s + net(p.gross), 0);

  return (
    <AccountShell
      title="Të ardhurat"
      subtitle={`Zgjoi mban ${KOMISIONI}% komision nga çdo punë e përfunduar. Pjesa tjetër transferohet në llogarinë tënde bankare.`}
      nav={proNav}
      user={{
        name: proSummary.name,
        initials: proSummary.initials,
        hue: proSummary.hue,
        caption: `${proSummary.profession} · ${proSummary.city}`,
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Vlera e punëve" value={`${totalGross}€`} hint="para komisionit" />
        <StatCard label="Komisioni i Zgjoit" value={`${totalGross - totalNet}€`} hint={`${KOMISIONI}% e vlerës`} />
        <StatCard label="Në llogarinë tënde" value={`${totalNet}€`} hint="i transferuar" />
      </div>

      <div className="mt-8">
        <SectionTitle>Transaksionet</SectionTitle>
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-4 font-semibold">Data</th>
                  <th className="px-5 py-4 font-semibold">Puna</th>
                  <th className="px-5 py-4 font-semibold">Vlera</th>
                  <th className="px-5 py-4 font-semibold">Komisioni</th>
                  <th className="px-5 py-4 font-semibold">Ti merr</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-4 text-muted">{p.date}</td>
                    <td className="px-5 py-4 font-bold text-ink">{p.job}</td>
                    <td className="px-5 py-4 text-muted">{p.gross}€</td>
                    <td className="px-5 py-4 text-muted">
                      −{p.gross - net(p.gross)}€
                    </td>
                    <td className="px-5 py-4 font-extrabold text-ink">
                      {net(p.gross)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey text-gold-dark">
            <Landmark size={20} />
          </span>
          <h3 className="mt-3 text-sm font-extrabold text-ink">Llogaria bankare</h3>
          <p className="mt-1 text-sm text-muted">
            Transfertat kryhen çdo të hënë për punët e konfirmuara gjatë javës.
          </p>
          <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm font-bold text-ink">
            XK00 0000 0000 0000 00
          </p>
        </Card>
        <Card>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey text-gold-dark">
            <ShieldCheck size={20} />
          </span>
          <h3 className="mt-3 text-sm font-extrabold text-ink">Si mbrohen paratë</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Klienti paguan përpara se puna të nisë. Shuma qëndron e bllokuar te
            Zgjoi dhe lirohet vetëm pasi klienti konfirmon përfundimin.
          </p>
        </Card>
      </div>

      <DemoNote />
    </AccountShell>
  );
}
