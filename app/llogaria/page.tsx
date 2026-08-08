import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle, StatCard, Badge, DemoNote } from "@/components/account/Bits";
import { clientNav } from "@/lib/nav";
import { clientSummary, clientStats, clientRequests, threads } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Llogaria ime — Zgjoi" };

export default function ClientPanel() {
  const open = clientRequests.filter(
    (r) => r.status === "aktive" || r.status === "ne-pritje"
  );

  return (
    <AccountShell
      title={`Mirë se erdhe, ${clientSummary.name.split(" ")[0]}`}
      subtitle="Kërkesat e tua, ofertat e reja dhe bisedat me profesionistët."
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {clientStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 border-gold bg-honey">
        <div>
          <p className="text-base font-extrabold text-ink">
            Ke nevojë për një mjeshtër?
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Publiko një kërkesë dhe merr oferta brenda pak minutash.
          </p>
        </div>
        <Link
          href="/kerkesa-e-re"
          className="flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white"
        >
          <Search size={16} /> Publiko kërkesë
        </Link>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle
            action={
              <Link href="/llogaria/kerkesat" className="flex items-center gap-1 text-sm font-semibold text-gold-dark">
                Të gjitha <ArrowRight size={15} />
              </Link>
            }
          >
            Kërkesat aktive
          </SectionTitle>

          <div className="space-y-3">
            {open.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">{r.service}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {r.pro ? `${r.pro} · ` : ""}
                      {r.city} · {r.date}
                    </p>
                  </div>
                  <Badge status={r.status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                  {r.price ? (
                    <span className="text-muted">
                      Vlera: <b className="text-ink">{r.price}€</b> · pagesa e
                      bllokuar deri në përfundim
                    </span>
                  ) : (
                    <span className="text-muted">
                      <b className="text-ink">{r.offers}</b> oferta të reja
                    </span>
                  )}
                  <Link
                    href={r.price ? "/llogaria/rezervimi" : "/llogaria/ofertat"}
                    className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted transition-colors hover:border-gold hover:text-gold-dark"
                  >
                    {r.price ? "Shiko rezervimin" : "Shiko ofertat"}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle
            action={
              <Link href="/llogaria/mesazhet" className="flex items-center gap-1 text-sm font-semibold text-gold-dark">
                Të gjitha <ArrowRight size={15} />
              </Link>
            }
          >
            Mesazhet e fundit
          </SectionTitle>

          <Card className="!p-0">
            <ul>
              {threads.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 border-b border-line px-5 py-4 last:border-0"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold text-xs font-extrabold"
                    style={{
                      background: `hsl(${t.hue} 70% 94%)`,
                      color: `hsl(${t.hue} 45% 32%)`,
                    }}
                  >
                    {t.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-sm text-ink">{t.with}</b>
                      <span className="shrink-0 text-xs text-muted">{t.time}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {t.last}
                    </span>
                  </span>
                  {t.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-extrabold text-ink">
                      {t.unread}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <DemoNote />
    </AccountShell>
  );
}
