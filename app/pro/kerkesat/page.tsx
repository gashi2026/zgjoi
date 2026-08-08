import type { Metadata } from "next";
import Link from "next/link";
import AccountShell from "@/components/AccountShell";
import { Card, Badge, DemoNote } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { proSummary, leads } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kërkesat — Zgjoi për profesionistë" };

export default function ProLeads() {
  return (
    <AccountShell
      title="Kërkesat"
      subtitle="Kërkesa nga klientë në kategorinë dhe qytetet ku punon. Ti vendos cilat i pranon."
      nav={proNav}
      user={{
        name: proSummary.name,
        initials: proSummary.initials,
        hue: proSummary.hue,
        caption: `${proSummary.profession} · ${proSummary.city}`,
      }}
    >
      <div className="space-y-3">
        {leads.map((l) => (
          <Card key={l.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-ink">{l.service}</h3>
                <p className="mt-1 text-xs text-muted">
                  {l.client} · {l.city} · {l.posted}
                </p>
              </div>
              <Badge status={l.status} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{l.detail}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-sm text-muted">
                Buxheti i klientit: <b className="text-ink">{l.budget}</b>
              </span>
              <span className="flex gap-2">
                <Link href="/pro/oferta" className="rounded-full bg-gold px-5 py-2 text-xs font-bold text-ink transition-colors hover:bg-gold-dark">
                  Dërgo ofertë
                </Link>
                <Link href="/pro/mesazhet" className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted transition-colors hover:border-gold hover:text-gold-dark">
                  Shkruaj klientit
                </Link>
              </span>
            </div>
          </Card>
        ))}
      </div>
      <DemoNote />
    </AccountShell>
  );
}
