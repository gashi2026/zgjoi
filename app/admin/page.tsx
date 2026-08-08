import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Headset, TrendingUp } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Zgjoi" };

const eur = (cents: number) => `${(cents / 100).toFixed(2)}€`;

export default async function AdminDashboard() {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin");

  const [userCount, proCount, pendingVerifs, openTickets, payments, requests] = await Promise.all([
    db.user.count(),
    db.proProfile.count(),
    db.proProfile.count({ where: { verification: "PENDING" } }),
    db.supportTicket.count({ where: { state: "OPEN" } }),
    db.payment.aggregate({ _sum: { amount: true, commissionAmount: true } }),
    db.serviceRequest.count(),
  ]);

  const stats = [
    { label: "Përdorues gjithsej", value: String(userCount), hint: `${proCount} profesionistë` },
    { label: "Kërkesa shërbimi", value: String(requests), hint: "të gjitha kohët" },
    { label: "Vëllimi i pagesave", value: eur(payments._sum.amount ?? 0), hint: `komisioni ${eur(payments._sum.commissionAmount ?? 0)}` },
    { label: "Verifikime në pritje", value: String(pendingVerifs), hint: "kërkojnë shqyrtim" },
  ];

  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Paneli i administrimit"
      subtitle="Gjendja e platformës në kohë reale."
      nav={adminNav}
      user={shellUser}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{s.value}</p>
            <p className="mt-0.5 text-xs text-muted">{s.hint}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <BadgeCheck size={18} className="text-gold-dark" /> Çka pret veprim
            </span>
          </SectionTitle>
          <ul className="space-y-3">
            <li className="flex items-center justify-between rounded-2xl bg-cream p-4">
              <div>
                <p className="text-sm font-bold text-ink">Verifikime profesionistësh</p>
                <p className="text-xs text-muted">{pendingVerifs} në pritje</p>
              </div>
              <Link href="/admin/perdoruesit" className="flex items-center gap-1 text-sm font-bold text-gold-dark hover:underline">
                Shqyrto <ArrowRight size={14} />
              </Link>
            </li>
            <li className="flex items-center justify-between rounded-2xl bg-cream p-4">
              <div>
                <p className="text-sm font-bold text-ink">Bisedat e mbështetjes</p>
                <p className="text-xs text-muted">{openTickets} të hapura</p>
              </div>
              <Link href="/admin/mbeshtetja" className="flex items-center gap-1 text-sm font-bold text-gold-dark hover:underline">
                Përgjigju <ArrowRight size={14} />
              </Link>
            </li>
          </ul>
        </Card>

        <Card>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <TrendingUp size={18} className="text-gold-dark" /> Hapat e ardhshëm
            </span>
          </SectionTitle>
          <ul className="space-y-2.5 text-sm text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              Importo kategoritë te <Link href="/admin/kategorite" className="font-semibold text-gold-dark hover:underline">Kategoritë</Link> nëse s&apos;e ke bërë ende.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              Vlerësimet moderohen te <Link href="/admin/vleresimet" className="font-semibold text-gold-dark hover:underline">Vlerësimet</Link>.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              Pagesat dhe komisionet te <Link href="/admin/transaksionet" className="font-semibold text-gold-dark hover:underline">Transaksionet</Link>.
            </li>
          </ul>
        </Card>
      </div>
    </AccountShell>
  );
}
