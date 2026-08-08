"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import { categories, cities } from "@/lib/data";
import { questionsFor, budgets, type Question } from "@/lib/wizard";

type Answers = Record<string, string | string[]>;

export default function RequestWizard() {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [city, setCity] = useState("");
  const [when, setWhen] = useState("");
  const [budget, setBudget] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const questions = category ? questionsFor(category) : [];
  const labels = ["Shërbimi", "Detajet", "Vendi dhe koha", "Përmbledhja"];

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [id]: value }));
    setError("");
  }

  function toggleMulti(id: string, option: string) {
    const current = (answers[id] as string[]) ?? [];
    setAnswer(
      id,
      current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
    );
  }

  function next() {
    if (step === 0 && !category) return setError("Zgjidh një kategori shërbimi.");
    if (step === 1) {
      const missing = questions.find((q) => {
        const v = answers[q.id];
        return !v || (Array.isArray(v) && v.length === 0);
      });
      if (missing) return setError(`Përgjigju pyetjes: ${missing.label}`);
    }
    if (step === 2) {
      if (!city) return setError("Zgjidh qytetin.");
      if (!when) return setError("Zgjidh kur ju nevojitet shërbimi.");
      if (!budget) return setError("Zgjidh një buxhet të përafërt.");
    }
    setError("");
    if (step < 3) return setStep(step + 1);
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setDone(true);
    }, 900);
  }

  if (done) {
    return (
      <div className="bg-cream">
        <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-honey">
            <CheckCircle2 size={32} className="text-gold-dark" />
          </span>
          <h1 className="mt-6 text-2xl font-extrabold text-ink sm:text-3xl">
            Kërkesa u dërgua!
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Profesionistët e verifikuar në {city} do të dërgojnë ofertat e tyre.
            Zakonisht ofertat e para vijnë brenda 30 minutash.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/llogaria/ofertat" className="rounded-full bg-gold px-7 py-3 text-sm font-bold text-ink hover:bg-gold-dark">
              Shiko ofertat
            </Link>
            <Link href="/llogaria" className="rounded-full border border-line bg-white px-7 py-3 text-sm font-semibold text-ink hover:border-gold">
              Llogaria ime
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
      active
        ? "border-gold bg-honey text-ink"
        : "border-line bg-white text-muted hover:border-gold hover:text-gold-dark"
    }`;

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <Link href="/llogaria" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-gold-dark">
          <ArrowLeft size={15} /> Llogaria ime
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Përshkruaj punën që të duhet
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Sa më shumë detaje, aq më të sakta janë ofertat që merr.
        </p>

        {/* progress */}
        <div className="mt-8 flex items-center gap-2">
          {labels.map((l, i) => (
            <div key={l} className="flex flex-1 items-center gap-2">
              <span className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-gold" : "bg-line"}`} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted">
          Hapi {step + 1} nga 4 · {labels[step]}
        </p>

        <div className="mt-5 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          {step === 0 && (
            <>
              <h2 className="text-lg font-extrabold text-ink">Çfarë shërbimi ju nevojitet?</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => {
                      setCategory(c.slug);
                      setAnswers({});
                      setError("");
                    }}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                      category === c.slug
                        ? "border-gold bg-honey"
                        : "border-line bg-white hover:-translate-y-0.5 hover:border-gold"
                    }`}
                  >
                    <CategoryIcon name={c.icon} size={24} className="text-gold-dark" />
                    <span className="text-[13px] font-bold text-ink">{c.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-extrabold text-ink">Detajet e punës</h2>
              <p className="mt-1 text-sm text-muted">
                Pyetjet ndryshojnë sipas shërbimit që zgjodhe.
              </p>
              <div className="mt-6 space-y-6">
                {questions.map((q: Question) => (
                  <div key={q.id}>
                    <p className="text-sm font-bold text-ink">{q.label}</p>

                    {q.type === "single" && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {q.options.map((o) => (
                          <button key={o} type="button" onClick={() => setAnswer(q.id, o)} className={chip(answers[q.id] === o)}>
                            {o}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === "multi" && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {q.options.map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => toggleMulti(q.id, o)}
                            className={chip(((answers[q.id] as string[]) ?? []).includes(o))}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === "number" && (
                      <div className="mt-2.5 flex items-center gap-3">
                        <input
                          inputMode="numeric"
                          placeholder={q.placeholder}
                          value={(answers[q.id] as string) ?? ""}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          className="w-40 rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-gold"
                        />
                        {q.unit && <span className="text-sm text-muted">{q.unit}</span>}
                      </div>
                    )}

                    {q.type === "text" && (
                      <textarea
                        rows={3}
                        placeholder={q.placeholder}
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="mt-2.5 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-gold"
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-extrabold text-ink">Ku dhe kur?</h2>
              <div className="mt-5 space-y-6">
                <div>
                  <p className="text-sm font-bold text-ink">Qyteti</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {cities.slice(0, 6).map((c) => (
                      <button key={c} type="button" onClick={() => setCity(c)} className={chip(city === c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Kur ju nevojitet?</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {["Sot", "Nesër", "Këtë javë", "Këtë muaj", "Fleksibël"].map((w) => (
                      <button key={w} type="button" onClick={() => setWhen(w)} className={chip(when === w)}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Buxheti i përafërt</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {budgets.map((b) => (
                      <button key={b} type="button" onClick={() => setBudget(b)} className={chip(budget === b)}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Diçka tjetër që duhet ditur? (opsionale)</p>
                  <textarea
                    rows={3}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="Qasja, parkimi, orari i preferuar…"
                    className="mt-2.5 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-gold"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-extrabold text-ink">Përmbledhja e kërkesës</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <Row label="Shërbimi" value={categories.find((c) => c.slug === category)?.name ?? "—"} />
                {questions.map((q) => (
                  <Row
                    key={q.id}
                    label={q.label}
                    value={
                      Array.isArray(answers[q.id])
                        ? (answers[q.id] as string[]).join(", ")
                        : ((answers[q.id] as string) || "—")
                    }
                  />
                ))}
                <Row label="Qyteti" value={city} />
                <Row label="Koha" value={when} />
                <Row label="Buxheti" value={budget} />
                {detail && <Row label="Shënim" value={detail} />}
              </dl>
              <p className="mt-6 rounded-xl bg-cream px-4 py-3 text-sm text-muted">
                Kërkesa shkon te profesionistët e verifikuar në {city || "qytetin tënd"}.
                Nuk paguan asgjë derisa të pranosh një ofertë.
              </p>
            </>
          )}

          {error && (
            <p className="mt-5 rounded-xl bg-[#FDF0F0] px-4 py-3 text-sm font-semibold text-[#B4232A]">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-muted enabled:hover:border-gold enabled:hover:text-gold-dark disabled:opacity-40"
            >
              Prapa
            </button>
            <button
              type="button"
              onClick={next}
              disabled={sending}
              className="flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-sm font-bold text-ink transition-all hover:bg-gold-dark hover:shadow-lift disabled:opacity-70"
            >
              {sending && <Loader2 size={16} className="animate-spin" />}
              {step === 3 ? "Dërgo kërkesën" : "Vazhdo"}
              {!sending && step < 3 && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-line pb-3 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-bold text-ink">{value}</dd>
    </div>
  );
}
