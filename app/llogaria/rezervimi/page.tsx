import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Check, MapPin, MessageSquare, Phone } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, Badge, DemoNote } from "@/components/account/Bits";
import { Avatar } from "@/components/Brand";
import { clientNav } from "@/lib/nav";
import { clientSummary, booking, milestones } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Rezervimi — Zgjoi" };

export default function BookingPage() {
  return (
    <AccountShell
      title={booking.service}
      subtitle={`Rezervimi #${booking.id.toUpperCase()} · ${booking.date}`}
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={booking.initials} hue={booking.hue} size={56} />
                <div>
                  <p className="text-sm font-extrabold text-ink">{booking.pro}</p>
                  <p className="text-xs text-muted">Elektricist · i verifikuar</p>
                </div>
              </div>
              <Badge status={booking.status} />
            </div>

            <dl className="mt-6 space-y-4 border-t border-line pt-5 text-sm">
              <div className="flex gap-3">
                <CalendarClock size={17} className="mt-0.5 shrink-0 text-gold-dark" />
                <div>
                  <dt className="font-bold text-ink">{booking.date}</dt>
                  <dd className="text-muted">{booking.time}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin size={17} className="mt-0.5 shrink-0 text-gold-dark" />
                <div>
                  <dt className="font-bold text-ink">Adresa e shërbimit</dt>
                  <dd className="text-muted">{booking.address}</dd>
                  <dd className="mt-1 text-xs text-muted">{booking.note}</dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
              <Link
                href="/llogaria/mesazhet"
                className="flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark"
              >
                <MessageSquare size={15} /> Shkruaj profesionistit
              </Link>
              <button className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-muted hover:border-gold hover:text-gold-dark">
                <Phone size={15} /> Kërko telefonatë
              </button>
              <button className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-muted hover:border-ink hover:text-ink">
                Ndrysho orarin
              </button>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="text-sm font-extrabold text-ink">Ecuria e punës</h2>
            <ol className="relative mt-5 space-y-6">
              <span className="absolute bottom-3 left-[11px] top-3 w-px bg-line" aria-hidden="true" />
              {milestones.map((m) => (
                <li key={m.label} className="relative flex gap-4">
                  <span
                    className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      m.done ? "border-gold bg-gold text-ink" : "border-line bg-white text-line"
                    }`}
                  >
                    {m.done && <Check size={13} strokeWidth={3} />}
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${m.done ? "text-ink" : "text-muted"}`}>
                      {m.label}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{m.detail}</p>
                    <p className="mt-1 text-xs text-muted">{m.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div>
          <Card>
            <h2 className="text-sm font-extrabold text-ink">Pagesa</h2>
            <p className="mt-4 text-3xl font-extrabold text-ink">{booking.price}€</p>
            <p className="mt-1 text-sm text-muted">
              E bllokuar te Zgjoi që nga 29 Korrik
            </p>
            <div className="mt-5 rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
              Paratë lirohen te profesionisti vetëm pasi ti konfirmon se puna
              përfundoi. Nëse diçka shkon keq, hap një kontest dhe ekipi ynë
              ndërhyn.
            </div>
            <Link
              href="/llogaria/vleresim"
              className="mt-5 block rounded-full bg-gold px-5 py-3 text-center text-sm font-bold text-ink hover:bg-gold-dark"
            >
              Konfirmo përfundimin
            </Link>
            <button className="mt-2 w-full rounded-full border border-line px-5 py-3 text-sm font-semibold text-muted hover:border-ink hover:text-ink">
              Hap kontest
            </button>
          </Card>

          <Card className="mt-6">
            <h2 className="text-sm font-extrabold text-ink">Fatura</h2>
            <Link href="/llogaria/pagesa" className="mt-3 inline-block text-sm font-semibold text-gold-dark">
              Shiko faturën #ZGJ-2026-0771 →
            </Link>
          </Card>
        </div>
      </div>

      <DemoNote />
    </AccountShell>
  );
}
