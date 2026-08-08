import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle, StatCard, Badge, DemoNote } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { proSummary, proStats, leads, proJobs } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Paneli — Zgjoi për profesionistë" };

const user = {
  name: proSummary.name,
  initials: proSummary.initials,
  hue: proSummary.hue,
  caption: `${proSummary.profession} · ${proSummary.city}`,
};

export default function ProPanel() {
  const newLeads = leads.filter((l) => l.status === "e-re");
  const active = proJobs.filter((j) => j.status === "aktive");

  return (
    <AccountShell
      title={`Mirë se erdhe, ${proSummary.name.split(" ")[0]}`}
      subtitle="Kërkesat e reja, punët në vazhdim dhe të ardhurat e tua — të gjitha në një vend."
      nav={proNav}
      user={user}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {proStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle
            action={
              <Link href="/pro/kerkesat" className="flex items-center gap-1 text-sm font-semibold text-gold-dark">
                Të gjitha <ArrowRight size={15} />
              </Link>
            }
          >
            Kërkesa të reja
          </SectionTitle>

          <div className="space-y-3">
            {newLeads.map((l) => (
              <Card key={l.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">{l.service}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {l.client} · {l.city} · {l.posted}
                    </p>
                  </div>
                  <Badge status={l.status} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{l.detail}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted">
                    Buxheti: <b className="text-ink">{l.budget}</b>
                  </span>
                  <span className="flex gap-2">
                    <Link href="/pro/oferta" className="rounded-full bg-gold px-5 py-2 text-xs font-bold text-ink transition-colors hover:bg-gold-dark">
                      Dërgo ofertë
                    </Link>
                    <button className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted transition-colors hover:border-gold hover:text-gold-dark">
                      Refuzo
                    </button>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle
            action={
              <Link href="/pro/punet" className="flex items-center gap-1 text-sm font-semibold text-gold-dark">
                Të gjitha <ArrowRight size={15} />
              </Link>
            }
          >
            Punë në vazhdim
          </SectionTitle>

          <div className="space-y-3">
            {active.map((j) => (
              <Card key={j.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{j.service}</p>
                    <p className="mt-1 text-xs text-muted">
                      {j.client} · {j.date}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-ink">{j.amount}€</p>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Pagesa është e bllokuar te Zgjoi dhe lirohet pas konfirmimit.
                </p>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <div className="flex items-center gap-2">
              <BadgeCheck size={18} className="text-gold-dark" />
              <p className="text-sm font-extrabold text-ink">Profili yt</p>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Norma e përgjigjes</dt>
                <dd className="font-bold text-ink">{proSummary.responseRate}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Punë të përfunduara</dt>
                <dd className="font-bold text-ink">{proSummary.completionRate}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Anëtar që nga</dt>
                <dd className="font-bold text-ink">{proSummary.memberSince}</dd>
              </div>
            </dl>
            <Link
              href="/pro/profili"
              className="mt-4 inline-block text-sm font-semibold text-gold-dark"
            >
              Përditëso profilin →
            </Link>
          </Card>
        </div>
      </div>

      <DemoNote />
    </AccountShell>
  );
}
