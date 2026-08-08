import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Transaksionet — Admin" };

const stateChip: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Në pritje", cls: "bg-cream text-muted" },
  AUTHORISED: { label: "Autorizuar", cls: "bg-blue-50 text-blue-600" },
  HELD: { label: "Në mbajtje", cls: "bg-honey text-gold-dark" },
  RELEASED: { label: "Liruar", cls: "bg-green-50 text-green-600" },
  REFUNDED: { label: "Rimbursuar", cls: "bg-cream text-muted" },
  DISPUTED: { label: "Kontestuar", cls: "bg-red-50 text-red-600" },
  EXPIRED: { label: "Skaduar", cls: "bg-red-50 text-red-500" },
};

const eur = (cents: number) => `${(cents / 100).toFixed(2)}€`;

export default async function AdminTransactionsPage() {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/transaksionet");

  const payments = await db.payment.findMany({
    include: {
      request: {
        select: {
          title: true,
          client: { select: { name: true } },
          acceptedPro: { select: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totals = {
    volume: payments.reduce((s, p) => s + p.amount, 0),
    commission: payments
      .filter((p) => p.state === "RELEASED")
      .reduce((s, p) => s + p.commissionAmount, 0),
    held: payments
      .filter((p) => p.state === "HELD" || p.state === "AUTHORISED")
      .reduce((s, p) => s + p.amount, 0),
  };

  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Transaksionet"
      subtitle="Pagesat, komisionet dhe fondet në mbajtje."
      nav={adminNav}
      user={shellUser}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Vëllimi total</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{eur(totals.volume)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Komisioni i fituar</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{eur(totals.commission)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Në mbajtje tani</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{eur(totals.held)}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Receipt size={18} className="text-gold-dark" /> Të gjitha pagesat
          </span>
        </SectionTitle>

        {payments.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Ende nuk ka transaksione. Pagesat shfaqen këtu sapo klientët të pranojnë oferta dhe të paguajnë.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="py-2.5 pr-4">Puna</th>
                  <th className="py-2.5 pr-4">Klienti → Profesionisti</th>
                  <th className="py-2.5 pr-4">Shuma</th>
                  <th className="py-2.5 pr-4">Komisioni</th>
                  <th className="py-2.5">Statusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => {
                  const chip = stateChip[p.state] ?? stateChip.PENDING;
                  return (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 font-semibold text-ink">{p.request.title}</td>
                      <td className="py-3 pr-4 text-muted">
                        {p.request.client.name} → {p.request.acceptedPro?.user.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 font-bold text-ink">{eur(p.amount)}</td>
                      <td className="py-3 pr-4 text-muted">{eur(p.commissionAmount)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${chip.cls}`}>{chip.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AccountShell>
  );
}
