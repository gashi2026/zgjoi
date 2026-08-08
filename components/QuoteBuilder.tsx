"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { KOMISIONI, leads } from "@/lib/account";
import { chooseStrategy, strategyCopyPro, SHORT_JOB_MAX_DAYS, AUTH_HOLD_DAYS } from "@/lib/escrow";

type Line = { id: number; label: string; qty: string; price: string };

export default function QuoteBuilder() {
  const lead = leads[0];
  const [lines, setLines] = useState<Line[]>([
    { id: 1, label: "Montim llambash plafoni", qty: "6", price: "12" },
    { id: 2, label: "Zëvendësim çelësash", qty: "2", price: "10" },
  ]);
  const [message, setMessage] = useState(
    "Përshëndetje! Mund ta kryej punën të enjten paradite. Çmimi përfshin punën, jo materialin."
  );
  const [when, setWhen] = useState("E enjte, 5 Gusht — 10:00");
  const [duration, setDuration] = useState("3 orë");
  const [warranty, setWarranty] = useState("12 muaj garanci për punimin");
  const [expectedDays, setExpectedDays] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const total = lines.reduce(
    (s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0),
    0
  );
  const commission = Math.round((total * KOMISIONI) / 100);
  const strategy = chooseStrategy(expectedDays);
  const strategyNote = strategyCopyPro(strategy);

  const update = (id: number, key: keyof Line, value: string) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, [key]: value } : l)));

  function send() {
    const e: Record<string, string> = {};
    if (total <= 0) e.total = "Shto të paktën një zë me çmim.";
    if (message.trim().length < 20) e.message = "Shkruaj një mesazh më të plotë për klientin.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setState("sending");
    setTimeout(() => setState("done"), 900);
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-gold bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-honey">
          <CheckCircle2 size={28} className="text-gold-dark" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-ink">Oferta u dërgua</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {lead.client} do të njoftohet menjëherë. Nëse e pranon ofertën prej{" "}
          {total}€, puna shfaqet te &laquo;Punët&raquo; dhe pagesa bllokohet te Zgjoi.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/pro/kerkesat" className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-ink hover:bg-gold-dark">
            Kërkesa të tjera
          </Link>
          <Link href="/pro/paneli" className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-gold">
            Paneli
          </Link>
        </div>
      </div>
    );
  }

  const field = "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-gold";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-extrabold text-ink">Zërat e ofertës</h2>

        <div className="mt-5 space-y-3">
          {lines.map((l) => (
            <div key={l.id} className="grid grid-cols-[1fr_70px_90px_auto] items-center gap-2">
              <input
                value={l.label}
                onChange={(e) => update(l.id, "label", e.target.value)}
                placeholder="Përshkrimi i punës"
                className={field}
              />
              <input
                inputMode="numeric"
                value={l.qty}
                onChange={(e) => update(l.id, "qty", e.target.value.replace(/\D/g, ""))}
                placeholder="Sasia"
                className={field}
              />
              <div className="relative">
                <input
                  inputMode="numeric"
                  value={l.price}
                  onChange={(e) => update(l.id, "price", e.target.value.replace(/\D/g, ""))}
                  placeholder="Çmimi"
                  className={`${field} pr-7`}
                />
                <span className="absolute right-3 top-2.5 text-sm text-muted">€</span>
              </div>
              <button
                type="button"
                onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                aria-label="Hiq zërin"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:border-ink hover:text-ink"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            setLines((ls) => [...ls, { id: Date.now(), label: "", qty: "1", price: "" }])
          }
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-gold-dark"
        >
          <Plus size={15} /> Shto zë
        </button>

        {errors.total && (
          <p className="mt-3 text-xs font-semibold text-[#B4232A]">{errors.total}</p>
        )}

        <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Kur mund ta kryesh</span>
            <input value={when} onChange={(e) => setWhen(e.target.value)} className={`${field} mt-1.5`} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Kohëzgjatja</span>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} className={`${field} mt-1.5`} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">
              Sa ditë pune të duhen?
            </span>
            <input
              inputMode="numeric"
              value={expectedDays}
              onChange={(e) =>
                setExpectedDays(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))
              }
              className={`${field} mt-1.5`}
            />
            <span className="mt-1.5 block text-xs text-muted">
              Kjo përcakton si ruhet pagesa.
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-ink">Garancia</span>
            <input value={warranty} onChange={(e) => setWarranty(e.target.value)} className={`${field} mt-1.5`} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-ink">Mesazhi për klientin</span>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${field} mt-1.5`}
            />
            {errors.message && (
              <p className="mt-1.5 text-xs font-semibold text-[#B4232A]">{errors.message}</p>
            )}
          </label>
        </div>

        <button
          onClick={send}
          disabled={state === "sending"}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-ink transition-all hover:bg-gold-dark hover:shadow-lift disabled:opacity-70"
        >
          {state === "sending" && <Loader2 size={16} className="animate-spin" />}
          Dërgo ofertën — {total}€
        </button>
      </div>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="text-sm font-extrabold text-ink">Kërkesa e klientit</h2>
          <p className="mt-3 text-sm font-bold text-ink">{lead.service}</p>
          <p className="mt-1 text-xs text-muted">
            {lead.client} · {lead.city} · {lead.posted}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{lead.detail}</p>
          <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm text-muted">
            Buxheti i klientit: <b className="text-ink">{lead.budget}</b>
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="text-sm font-extrabold text-ink">{strategyNote.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{strategyNote.body}</p>
          {strategy === "AUTH_HOLD" && (
            <p className="mt-3 rounded-xl bg-honey px-4 py-3 text-xs leading-relaxed text-ink/80">
              Punët deri në {SHORT_JOB_MAX_DAYS} ditë përdorin rezervim karte,
              i cili skadon pas {AUTH_HOLD_DAYS} ditësh. Për punë më të gjata
              rrit ditët — pagesa atëherë tërhiqet menjëherë dhe ruhet e
              bllokuar, pa afat 7-ditor.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gold bg-white p-6 shadow-card">
          <h2 className="text-sm font-extrabold text-ink">Sa të mbetet ty</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Vlera e ofertës</dt>
              <dd className="font-bold text-ink">{total}€</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Komisioni ({KOMISIONI}%)</dt>
              <dd className="font-bold text-ink">−{commission}€</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2.5">
              <dt className="font-bold text-ink">Në llogarinë tënde</dt>
              <dd className="text-lg font-extrabold text-ink">{total - commission}€</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Komisioni mbahet vetëm nëse klienti e pranon ofertën dhe puna
            përfundon.
          </p>
        </div>
      </aside>
    </div>
  );
}
