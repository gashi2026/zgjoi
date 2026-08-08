import type { Metadata } from "next";
import { Bell, Lock, Trash2, UserRound } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle, DemoNote } from "@/components/account/Bits";
import { clientNav } from "@/lib/nav";
import { clientSummary } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cilësimet — Zgjoi" };

const fields = [
  ["Emri dhe mbiemri", clientSummary.name],
  ["Email", "blerta@example.com"],
  ["Telefon", "+383 44 000 000"],
  ["Qyteti", clientSummary.city],
];

const notifications = [
  ["Oferta të reja", "Njoftim kur një profesionist dërgon ofertë."],
  ["Mesazhe", "Njoftim për çdo mesazh të ri."],
  ["Kujtesa për vlerësim", "Kujtesë pas përfundimit të punës — dhe 10% zbritje."],
];

export default function SettingsPage() {
  return (
    <AccountShell
      title="Cilësimet"
      subtitle="Të dhënat e llogarisë, njoftimet dhe siguria."
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      <SectionTitle>Të dhënat personale</SectionTitle>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <label key={label} className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {label}
              </span>
              <input
                defaultValue={value}
                className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-gold"
              />
            </label>
          ))}
        </div>
        <button className="mt-5 flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-gold-dark">
          <UserRound size={16} /> Ruaj ndryshimet
        </button>
      </Card>

      <div className="mt-6">
        <SectionTitle>Njoftimet</SectionTitle>
        <Card>
          <ul className="space-y-4">
            {notifications.map(([title, text]) => (
              <li
                key={title}
                className="flex items-start justify-between gap-4 border-b border-line pb-4 last:border-0 last:pb-0"
              >
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Bell size={15} className="text-gold-dark" />
                    {title}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{text}</span>
                </span>
                <span className="mt-1 flex h-6 w-11 shrink-0 items-center rounded-full bg-gold px-1">
                  <span className="ml-auto h-4 w-4 rounded-full bg-white" />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <span className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Lock size={16} className="text-gold-dark" /> Fjalëkalimi
          </span>
          <p className="mt-2 text-sm text-muted">
            Ndrysho fjalëkalimin rregullisht për ta mbajtur llogarinë të sigurt.
          </p>
          <button className="mt-4 rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold-dark">
            Ndrysho fjalëkalimin
          </button>
        </Card>
        <Card>
          <span className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Trash2 size={16} className="text-gold-dark" /> Fshi llogarinë
          </span>
          <p className="mt-2 text-sm text-muted">
            Fshirja është e përhershme. Historiku i punëve nuk mund të rikthehet.
          </p>
          <button className="mt-4 rounded-full border border-line px-5 py-2 text-sm font-semibold text-muted transition-colors hover:border-ink hover:text-ink">
            Fshi llogarinë
          </button>
        </Card>
      </div>

      <DemoNote />
    </AccountShell>
  );
}
