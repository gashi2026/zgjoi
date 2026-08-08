import type { Metadata } from "next";
import Link from "next/link";
import AccountShell from "@/components/AccountShell";
import { Card, Badge, DemoNote } from "@/components/account/Bits";
import { clientNav } from "@/lib/nav";
import { clientSummary, clientRequests } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kërkesat e mia — Zgjoi" };

export default function ClientRequestsPage() {
  return (
    <AccountShell
      title="Kërkesat e mia"
      subtitle="Çdo kërkesë që ke publikuar dhe statusi i saj."
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      <div className="space-y-3">
        {clientRequests.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-ink">{r.service}</h3>
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
                  Vlera: <b className="text-ink">{r.price}€</b>
                </span>
              ) : (
                <span className="text-muted">
                  <b className="text-ink">{r.offers}</b> oferta për t&apos;u
                  shqyrtuar
                </span>
              )}
              <span className="flex gap-2">
                {r.status === "perfunduar" ? (
                  <Link
                    href="/llogaria/vleresim"
                    className="rounded-full bg-gold px-5 py-2 text-xs font-bold text-ink transition-colors hover:bg-gold-dark"
                  >
                    Lër vlerësim · −10% herën tjetër
                  </Link>
                ) : (
                  <Link
                    href={r.price ? "/llogaria/rezervimi" : "/llogaria/ofertat"}
                    className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted transition-colors hover:border-gold hover:text-gold-dark"
                  >
                    Shiko detajet
                  </Link>
                )}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <DemoNote />
    </AccountShell>
  );
}
