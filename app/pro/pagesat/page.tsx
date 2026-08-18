import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock3, Hourglass, Wallet } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagesat e mia — Zgjoi" };

const eur = (cents: number) => `${(cents / 100).toFixed(2)}€`;
const dt = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export default async function ProPaymentsPage() {
  const me = await currentUser();
  if (!me || me.role !== "PRO") redirect("/hyr?next=/pro/pagesat");

  const profile = await db.proProfile.findUnique({ where: { userId: me.id } });
  if (!profile) redirect("/pro/profili");

  const [pending, payouts] = await Promise.all([
    // money held by Zgjoi for this pro's jobs, not yet paid out
    db.payment.findMany({
      where: {
        state: { in: ["PENDING", "AUTHORISED", "HELD"] },
        request: { acceptedProfileId: profile.id },
      },
      include: { request: { select: { title: true, state: true, client: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.payout.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const waitingWork = pending.filter((p) => p.request.state !== "COMPLETED");
  const waitingPayout = pending.filter((p) => p.request.state === "COMPLETED");

  const totalPending = pending.reduce((s, p) => s + p.proAmount, 0);
  const dueNow = waitingPayout.reduce((s, p) => s + p.proAmount, 0);
  const paidTotal = payouts.filter((p) => p.state === "PAID").reduce((s, p) => s + p.amount, 0);

  const shellUser = {
    name: me.name,
    initials: me.name.slice(0, 2).toUpperCase(),
    hue: 38,
    caption: "Profesionist",
  };

  return (
    <AccountShell
      title="Pagesat e mia"
      subtitle="Çka është në pritje dhe çka është paguar deri tani."
      nav={proNav}
      user={shellUser}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Në pritje gjithsej</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{eur(totalPending)}</p>
          <p className="mt-0.5 text-xs text-muted">{pending.length} punë</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gati për pagesë</p>
          <p className="mt-1 text-2xl font-extrabold text-gold-dark">{eur(dueNow)}</p>
          <p className="mt-0.5 text-xs text-muted">brenda 5 ditëve pune</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paguar deri tani</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{eur(paidTotal)}</p>
          <p className="mt-0.5 text-xs text-muted">{payouts.filter((p) => p.state === "PAID").length} transfere</p>
        </Card>
      </div>

      {/* ready to be paid */}
      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Hourglass size={18} className="text-gold-dark" /> Gati për pagesë ({waitingPayout.length})
          </span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">
          Klienti e ka konfirmuar punën. Transferi kryhet brenda 5 ditëve pune në llogarinë tënde.
        </p>
        {waitingPayout.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Asnjë pagesë në radhë për momentin.</p>
        ) : (
          <ul className="divide-y divide-line">
            {waitingPayout.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-bold text-ink">{p.request.title}</p>
                  <p className="text-xs text-muted">Klienti: {p.request.client.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-gold-dark">{eur(p.proAmount)}</p>
                  <p className="text-xs text-muted">nga {eur(p.amount)} të punës</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* work still in progress */}
      {waitingWork.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Clock3 size={18} className="text-gold-dark" /> Punë në vazhdim ({waitingWork.length})
            </span>
          </SectionTitle>
          <p className="mb-4 text-sm text-muted">
            Paratë mbahen te Zgjoi derisa klienti ta konfirmojë përfundimin.
          </p>
          <ul className="divide-y divide-line">
            {waitingWork.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-bold text-ink">{p.request.title}</p>
                  <p className="text-xs text-muted">
                    {p.request.client.name} ·{" "}
                    {p.state === "PENDING" ? "duke pritur arkëtimin" : "paratë të mbajtura"}
                  </p>
                </div>
                <p className="text-sm font-bold text-ink">{eur(p.proAmount)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* payout history */}
      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Wallet size={18} className="text-gold-dark" /> Pagesat e kryera
          </span>
        </SectionTitle>
        {payouts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Ende asnjë pagesë e kryer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="py-2.5 pr-4">Data</th>
                  <th className="py-2.5 pr-4">Shuma</th>
                  <th className="py-2.5 pr-4">Referenca</th>
                  <th className="py-2.5">Statusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 text-muted">{dt(p.paidAt ?? p.scheduledFor)}</td>
                    <td className="py-3 pr-4 font-bold text-ink">{eur(p.amount)}</td>
                    <td className="py-3 pr-4 text-muted">{p.reference ?? "—"}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          p.state === "PAID"
                            ? "bg-green-50 text-green-600"
                            : p.state === "FAILED"
                              ? "bg-red-50 text-red-600"
                              : "bg-honey text-gold-dark"
                        }`}
                      >
                        {p.state === "PAID" ? "Paguar" : p.state === "FAILED" ? "Dështoi" : "E planifikuar"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AccountShell>
  );
}
