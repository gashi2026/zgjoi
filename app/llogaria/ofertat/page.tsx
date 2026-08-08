import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarClock, Clock, ShieldCheck, Star } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, DemoNote } from "@/components/account/Bits";
import { Avatar } from "@/components/Brand";
import { clientNav } from "@/lib/nav";
import { clientSummary, quotes } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ofertat — Zgjoi" };

const cheapest = Math.min(...quotes.map((q) => q.price));
const best = quotes.reduce((a, b) => (b.rating > a.rating ? b : a));

export default function QuotesPage() {
  return (
    <AccountShell
      title="Krahaso ofertat"
      subtitle="Pastrim i thellë — 3 dhoma · Prishtinë · 5 Gusht 2026"
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {quotes.map((q) => {
          const isCheapest = q.price === cheapest;
          const isBest = q.id === best.id;
          return (
            <Card
              key={q.id}
              className={`flex flex-col ${isBest ? "!border-gold shadow-lift" : ""}`}
            >
              {(isBest || isCheapest) && (
                <span className="mb-3 inline-block w-fit rounded-full bg-honey px-3 py-1 text-xs font-extrabold text-gold-dark">
                  {isBest ? "Vlerësimi më i lartë" : "Çmimi më i ulët"}
                </span>
              )}

              <div className="flex items-center gap-3">
                <Avatar initials={q.initials} hue={q.hue} size={52} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                    {q.pro}
                    {q.verified && <BadgeCheck size={15} className="text-gold-dark" />}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <Star size={12} className="fill-gold text-gold" />
                    {q.rating} ({q.reviews} vlerësime)
                  </p>
                </div>
              </div>

              <p className="mt-5 text-3xl font-extrabold text-ink">
                {q.price}€
                <span className="ml-1 text-sm font-semibold text-muted">
                  {q.priceType === "fikse" ? "fikse" : "/orë"}
                </span>
              </p>

              <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <CalendarClock size={15} className="text-gold-dark" />
                  {q.availability}
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Clock size={15} className="text-gold-dark" />
                  Kohëzgjatja: {q.duration}
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <ShieldCheck size={15} className="text-gold-dark" />
                  {q.warranty === "—" ? "Pa garanci të deklaruar" : q.warranty}
                </div>
              </dl>

              <p className="mt-4 text-sm leading-relaxed text-muted">{q.message}</p>

              <ul className="mt-4 flex flex-wrap gap-2">
                {q.includes.map((i) => (
                  <li
                    key={i}
                    className="rounded-full border border-line bg-cream px-3 py-1 text-xs text-muted"
                  >
                    {i}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex gap-2 pt-6">
                <Link
                  href="/llogaria/pagesa"
                  className="flex-1 rounded-full bg-gold px-4 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:bg-gold-dark"
                >
                  Prano ofertën
                </Link>
                <Link
                  href="/llogaria/mesazhet"
                  className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-gold hover:text-gold-dark"
                >
                  Pyet
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <h2 className="text-sm font-extrabold text-ink">Krahasim i shpejtë</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-3 pr-4 font-semibold">Profesionisti</th>
                <th className="py-3 pr-4 font-semibold">Çmimi</th>
                <th className="py-3 pr-4 font-semibold">Data</th>
                <th className="py-3 pr-4 font-semibold">Kohëzgjatja</th>
                <th className="py-3 font-semibold">Vlerësimi</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 font-bold text-ink">{q.pro}</td>
                  <td className="py-3 pr-4 font-bold text-ink">
                    {q.price}€ {q.priceType === "për orë" && <span className="font-normal text-muted">/orë</span>}
                  </td>
                  <td className="py-3 pr-4 text-muted">{q.availability}</td>
                  <td className="py-3 pr-4 text-muted">{q.duration}</td>
                  <td className="py-3 text-muted">{q.rating} ★</td>
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
