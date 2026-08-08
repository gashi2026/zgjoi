import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle, DemoNote } from "@/components/account/Bits";
import { Avatar } from "@/components/Brand";
import { proNav } from "@/lib/nav";
import { proSummary } from "@/lib/account";
import { getProfessional, getReviews } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profili im — Zgjoi për profesionistë" };

export default function ProProfilePage() {
  const pro = getProfessional("arben-elektricist");
  const reviews = getReviews("arben-elektricist");

  return (
    <AccountShell
      title="Profili im"
      subtitle="Kështu të shohin klientët. Sa më i plotë profili, aq më shumë kërkesa merr."
      nav={proNav}
      user={{
        name: proSummary.name,
        initials: proSummary.initials,
        hue: proSummary.hue,
        caption: `${proSummary.profession} · ${proSummary.city}`,
      }}
    >
      <Card>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar initials={proSummary.initials} hue={proSummary.hue} size={84} />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
              {proSummary.name}
              {proSummary.verified && (
                <BadgeCheck size={18} className="text-gold-dark" />
              )}
            </h2>
            <p className="text-sm text-muted">
              {proSummary.profession} · {proSummary.city}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <Star size={14} className="fill-gold text-gold" />
              <b className="text-ink">{proSummary.rating}</b> ({proSummary.reviews}{" "}
              vlerësime)
            </p>
          </div>
          <Link
            href="/profesionisti/arben-elektricist"
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold-dark"
          >
            Shiko si klient
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionTitle>Të dhënat e profilit</SectionTitle>
          <Card>
            <div className="space-y-4">
              {[
                ["Emri i plotë", proSummary.name],
                ["Kategoria", proSummary.profession],
                ["Qytetet ku punon", "Prishtinë, Fushë Kosovë, Obiliq"],
                ["Çmimi fillestar", `${pro?.priceFrom ?? 15}€ / orë`],
                ["Disponueshmëria", "E hënë – e shtunë, 08:00–19:00"],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">{value}</p>
                </div>
              ))}
            </div>
            <button className="mt-5 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-gold-dark">
              Ndrysho të dhënat
            </button>
          </Card>

          <SectionTitle>
            <span className="mt-6 block">Shërbimet dhe çmimet</span>
          </SectionTitle>
          <Card>
            <ul className="space-y-3">
              {pro?.services.map((s) => (
                <li
                  key={s.name}
                  className="flex items-center justify-between border-b border-line pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span className="text-ink">{s.name}</span>
                  <span className="font-bold text-ink">nga {s.price}€</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div>
          <SectionTitle>Vlerësimet e fundit</SectionTitle>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.author + r.date}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">{r.author}</p>
                  <span className="flex items-center gap-1 text-sm text-ink">
                    <Star size={13} className="fill-gold text-gold" />
                    {r.rating}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{r.text}</p>
                <p className="mt-2 text-xs text-muted">
                  {r.city} · {r.date}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <DemoNote />
    </AccountShell>
  );
}
