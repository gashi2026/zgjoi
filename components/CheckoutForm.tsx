"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { invoice, booking } from "@/lib/account";
import { chooseStrategy, strategyCopy } from "@/lib/escrow";

export default function CheckoutForm() {
  const [card, setCard] = useState("");
  const [name, setName] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const subtotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const total = subtotal + invoice.serviceFee;

  /* The professional's quoted duration decides how the money is protected. */
  const expectedDays = 2;
  const strategy = chooseStrategy(expectedDays);
  const copy = strategyCopy(strategy);

  function pay() {
    const e: Record<string, string> = {};
    if (card.replace(/\s/g, "").length < 12) e.card = "Numri i kartës nuk është i plotë.";
    if (name.trim().length < 3) e.name = "Shkruaj emrin si në kartë.";
    if (!/^\d{2}\/\d{2}$/.test(exp)) e.exp = "Formati: MM/VV";
    if (cvc.length < 3) e.cvc = "CVC ka 3 shifra.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setState("sending");
    setTimeout(() => setState("done"), 1000);
  }

  const field = "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-gold";
  const err = "mt-1.5 text-xs font-semibold text-[#B4232A]";

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-gold bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-honey">
          <CheckCircle2 size={28} className="text-gold-dark" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-ink">
          {strategy === "AUTH_HOLD" ? "Shuma u rezervua" : "Pagesa u sigurua"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {strategy === "AUTH_HOLD"
            ? `${total}€ janë ngrirë në kartën tënde. Tërhiqen vetëm kur ta konfirmosh punën.`
            : `${total}€ janë ruajtur të bllokuara. Profesionisti i merr vetëm pasi ti konfirmon përfundimin.`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/llogaria/rezervimi" className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-ink hover:bg-gold-dark">
            Shiko rezervimin
          </Link>
          <Link href="/llogaria" className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-gold">
            Llogaria ime
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <CreditCard size={19} className="text-gold-dark" /> Të dhënat e kartës
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-ink">Numri i kartës</span>
            <input
              inputMode="numeric"
              value={card}
              onChange={(e) =>
                setCard(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 16)
                    .replace(/(.{4})/g, "$1 ")
                    .trim()
                )
              }
              placeholder="0000 0000 0000 0000"
              className={field}
            />
            {errors.card && <p className={err}>{errors.card}</p>}
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-ink">Emri në kartë</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="BLERTA KRASNIQI" className={field} />
            {errors.name && <p className={err}>{errors.name}</p>}
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Skadimi</span>
            <input
              value={exp}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setExp(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
              }}
              placeholder="MM/VV"
              className={field}
            />
            {errors.exp && <p className={err}>{errors.exp}</p>}
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">CVC</span>
            <input
              inputMode="numeric"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              className={field}
            />
            {errors.cvc && <p className={err}>{errors.cvc}</p>}
          </label>
        </div>

        <p className="mt-6 flex items-start gap-2.5 rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
          <Lock size={16} className="mt-0.5 shrink-0 text-gold-dark" />
          Të dhënat e kartës përpunohen nga procesori ynë i licencuar bankar.
          Zgjoi nuk i ruan ato.
        </p>

        <button
          onClick={pay}
          disabled={state === "sending"}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-ink transition-all hover:bg-gold-dark hover:shadow-lift disabled:opacity-70"
        >
          {state === "sending" && <Loader2 size={16} className="animate-spin" />}
          {strategy === "AUTH_HOLD" ? "Rezervo" : "Paguaj"} {total}€
        </button>
      </div>

      <aside>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="text-sm font-extrabold text-ink">Fatura {invoice.number}</h2>
          <p className="mt-1 text-xs text-muted">
            {booking.service} · {booking.pro}
          </p>

          <ul className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
            {invoice.items.map((i) => (
              <li key={i.label} className="flex justify-between gap-4">
                <span className="text-muted">{i.label}</span>
                <span className="font-bold text-ink">{i.amount}€</span>
              </li>
            ))}
            <li className="flex justify-between gap-4">
              <span className="text-muted">Tarifa e shërbimit</span>
              <span className="font-bold text-ink">{invoice.serviceFee}€</span>
            </li>
          </ul>

          <div className="mt-4 flex justify-between border-t border-line pt-4">
            <span className="text-sm font-bold text-ink">Totali</span>
            <span className="text-xl font-extrabold text-ink">{total}€</span>
          </div>

          <div className="mt-5 rounded-xl bg-honey p-4 text-xs leading-relaxed text-ink/80">
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-extrabold text-ink">
                <ShieldCheck size={15} /> {copy.title}
              </span>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-gold-dark">
                {copy.badge}
              </span>
            </span>
            <p className="mt-2">{copy.body}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
