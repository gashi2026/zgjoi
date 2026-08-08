import type { Metadata } from "next";
import { Clock } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, Badge, SectionTitle, DemoNote } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { proSummary, appointments } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kalendari — Zgjoi për profesionistë" };

const weekdays = ["H", "M", "M", "E", "P", "Sh", "D"];
/* Gusht 2026 fillon të shtunën */
const firstWeekday = 5; // 0 = e hënë
const daysInMonth = 31;

const hours = [
  ["E hënë – E premte", "08:00 – 19:00"],
  ["E shtunë", "09:00 – 15:00"],
  ["E diel", "Pushim"],
];

export default function CalendarPage() {
  const byDay = new Map<number, typeof appointments>();
  appointments.forEach((a) => {
    byDay.set(a.day, [...(byDay.get(a.day) ?? []), a]);
  });

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <AccountShell
      title="Kalendari"
      subtitle="Gusht 2026 · takimet e konfirmuara dhe ato në pritje."
      nav={proNav}
      user={{
        name: proSummary.name,
        initials: proSummary.initials,
        hue: proSummary.hue,
        caption: `${proSummary.profession} · ${proSummary.city}`,
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {weekdays.map((d, i) => (
              <span key={i} className="pb-2 text-xs font-bold uppercase text-muted">
                {d}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`e-${i}`} />;
              const items = byDay.get(day) ?? [];
              return (
                <div
                  key={day}
                  className={`min-h-[74px] rounded-xl border p-1.5 text-left ${
                    items.length
                      ? "border-gold bg-honey"
                      : "border-line bg-white"
                  }`}
                >
                  <span className="text-xs font-bold text-ink">{day}</span>
                  {items.slice(0, 2).map((a) => (
                    <span
                      key={a.time}
                      className="mt-1 block truncate rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-ink"
                    >
                      {a.time} {a.client}
                    </span>
                  ))}
                  {items.length > 2 && (
                    <span className="mt-0.5 block text-[10px] text-muted">
                      +{items.length - 2} të tjera
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div>
          <SectionTitle>Takimet e ardhshme</SectionTitle>
          <div className="space-y-3">
            {appointments.slice(0, 5).map((a) => (
              <Card key={`${a.day}-${a.time}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{a.service}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <Clock size={12} /> {a.day} Gusht, {a.time} · {a.client}
                    </p>
                  </div>
                  <Badge status={a.status} />
                </div>
              </Card>
            ))}
          </div>

          <SectionTitle>
            <span className="mt-6 block">Orari i punës</span>
          </SectionTitle>
          <Card>
            <ul className="space-y-3 text-sm">
              {hours.map(([d, h]) => (
                <li key={d} className="flex justify-between border-b border-line pb-3 last:border-0 last:pb-0">
                  <span className="text-muted">{d}</span>
                  <span className="font-bold text-ink">{h}</span>
                </li>
              ))}
            </ul>
            <button className="mt-5 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-gold hover:text-gold-dark">
              Ndrysho orarin
            </button>
          </Card>
        </div>
      </div>

      <DemoNote />
    </AccountShell>
  );
}
