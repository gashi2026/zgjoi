"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Landmark,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Bee, HexOutline } from "./Brand";
import { categories, cities } from "@/lib/data";
import { KOMISIONI } from "@/lib/account";



type Errors = Record<string, string>;

const steps = ["Llogaria", "Profesioni", "Pagesa"];

export default function ProSignupForm() {
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [form, setForm] = useState({
    name: "",
    personalNo: "",
    email: "",
    phone: "",
    password: "",
    category: "",
    city: "",
    experience: "",
    about: "",
    priceFrom: "",
    iban: "",
    terms: false,
  });

  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validate(current: number): boolean {
    const e: Errors = {};
    if (current === 0) {
      if (form.name.trim().length < 3) e.name = "Shkruaj emrin dhe mbiemrin.";
      if (!/^\d{10}$/.test(form.personalNo))
        e.personalNo = "Numri personal duhet të ketë saktësisht 10 shifra.";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Email-i nuk duket i saktë.";
      if (form.phone.replace(/\D/g, "").length < 8)
        e.phone = "Shkruaj një numër telefoni të vlefshëm.";
      if (form.password.length < 8)
        e.password = "Fjalëkalimi duhet të ketë të paktën 8 karaktere.";
    }
    if (current === 1) {
      if (!form.category) e.category = "Zgjidh një kategori.";
      if (!form.city) e.city = "Zgjidh qytetin ku punon.";
      if (!form.experience) e.experience = "Zgjidh vitet e përvojës.";
      if (form.about.trim().length < 30)
        e.about = "Përshkrimi duhet të ketë të paktën 30 karaktere.";
      if (!form.priceFrom || Number(form.priceFrom) <= 0)
        e.priceFrom = "Shkruaj një çmim fillestar.";
    }
    if (current === 2) {
      if (form.iban.replace(/\s/g, "").length < 10)
        e.iban = "Shkruaj numrin e llogarisë bankare.";
      if (!form.terms) e.terms = "Duhet t'i pranosh kushtet për të vazhduar.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate(step)) return;
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
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
            Aplikimi u dërgua!
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Ekipi i Zgjoit do të verifikojë të dhënat e tua brenda 48 orësh. Sapo
            profili të aprovohet, kërkesat e klientëve fillojnë të vijnë.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/pro/paneli"
              className="rounded-full bg-gold px-7 py-3 text-sm font-bold text-ink transition-colors hover:bg-gold-dark"
            >
              Shko te paneli
            </Link>
            <Link
              href="/"
              className="rounded-full border border-line bg-white px-7 py-3 text-sm font-semibold text-ink transition-colors hover:border-gold"
            >
              Kthehu në ballinë
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted">
            Demonstrim: asnjë e dhënë nuk ruhet derisa të lidhet backend-i.
          </p>
        </div>
      </div>
    );
  }

  const field =
    "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-gold";
  const errText = "mt-1.5 text-xs font-semibold text-[#B4232A]";

  return (
    <div className="bg-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_320px] lg:py-16">
        {/* Form */}
        <div>
          <Link
            href="/profesionistet"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-gold-dark"
          >
            <ArrowLeft size={15} /> Për profesionistët
          </Link>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Bëhu profesionist në Zgjoi
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Regjistrimi është falas. Komisioni merret vetëm nga punët e
            përfunduara — përqindjen e saktë e sheh para se ta konfirmosh.
          </p>

          {/* Stepper */}
          <ol className="mt-8 flex items-center gap-2">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                    i <= step ? "bg-gold text-ink" : "bg-white text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    i <= step ? "text-ink" : "text-muted"
                  }`}
                >
                  {s}
                </span>
                {i < steps.length - 1 && (
                  <span className="ml-1 hidden h-px flex-1 bg-line sm:block" />
                )}
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-ink">
                    Emri dhe mbiemri
                  </span>
                  <input
                    className={field}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="p.sh. Arben Krasniqi"
                  />
                  {errors.name && <p className={errText}>{errors.name}</p>}
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-ink">
                    Numri personal
                  </span>
                  <input
                    inputMode="numeric"
                    className={field}
                    value={form.personalNo}
                    onChange={(e) =>
                      set("personalNo", e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="10 shifra"
                    aria-describedby="pn-help"
                  />
                  {errors.personalNo ? (
                    <p className={errText}>{errors.personalNo}</p>
                  ) : (
                    <p id="pn-help" className="mt-1.5 text-xs text-muted">
                      {form.personalNo.length}/10 shifra · përdoret vetëm për
                      verifikimin e profilit dhe nuk shfaqet publikisht.
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Email</span>
                  <input
                    className={field}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="emri@example.com"
                  />
                  {errors.email && <p className={errText}>{errors.email}</p>}
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Telefoni</span>
                  <input
                    className={field}
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+383 4X XXX XXX"
                  />
                  {errors.phone && <p className={errText}>{errors.phone}</p>}
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-ink">
                    Fjalëkalimi
                  </span>
                  <input
                    type="password"
                    className={field}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Të paktën 8 karaktere"
                  />
                  {errors.password && <p className={errText}>{errors.password}</p>}
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Kategoria</span>
                  <select
                    className={field}
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  >
                    <option value="">Zgjidh kategorinë</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className={errText}>{errors.category}</p>}
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Qyteti</span>
                  <select
                    className={field}
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  >
                    <option value="">Zgjidh qytetin</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.city && <p className={errText}>{errors.city}</p>}
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Përvoja</span>
                  <select
                    className={field}
                    value={form.experience}
                    onChange={(e) => set("experience", e.target.value)}
                  >
                    <option value="">Zgjidh vitet</option>
                    <option value="0-2">0–2 vjet</option>
                    <option value="3-5">3–5 vjet</option>
                    <option value="6-10">6–10 vjet</option>
                    <option value="10+">Mbi 10 vjet</option>
                  </select>
                  {errors.experience && (
                    <p className={errText}>{errors.experience}</p>
                  )}
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">
                    Çmimi fillestar (€)
                  </span>
                  <input
                    inputMode="numeric"
                    className={field}
                    value={form.priceFrom}
                    onChange={(e) => set("priceFrom", e.target.value)}
                    placeholder="p.sh. 15"
                  />
                  {errors.priceFrom && <p className={errText}>{errors.priceFrom}</p>}
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-ink">
                    Përshkrimi i punës sate
                  </span>
                  <textarea
                    rows={4}
                    className={field}
                    value={form.about}
                    onChange={(e) => set("about", e.target.value)}
                    placeholder="Çfarë punësh kryen, si punon, çfarë të dallon nga të tjerët."
                  />
                  {errors.about && <p className={errText}>{errors.about}</p>}
                </label>

                <div className="rounded-xl border border-dashed border-line bg-cream p-4 text-sm text-muted sm:col-span-2">
                  <span className="flex items-center gap-2 font-bold text-ink">
                    <BadgeCheck size={16} className="text-gold-dark" />
                    Verifikimi
                  </span>
                  <p className="mt-1.5">
                    Pas dërgimit, do të kërkojmë një dokument identifikimi dhe
                    certifikatat profesionale që ke. Verifikimi zgjat deri në 48
                    orë.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">
                    Llogaria bankare (IBAN)
                  </span>
                  <input
                    className={field}
                    value={form.iban}
                    onChange={(e) => set("iban", e.target.value)}
                    placeholder="XK00 0000 0000 0000 00"
                  />
                  {errors.iban && <p className={errText}>{errors.iban}</p>}
                  <span className="mt-2 block text-xs text-muted">
                    Të gjitha pagesat kryhen përmes bankës. Nuk pranojmë pagesa
                    në dorë.
                  </span>
                </label>

                <div className="rounded-xl bg-cream p-5">
                  <h3 className="text-sm font-extrabold text-ink">
                    Si do të paguhesh
                  </h3>
                  <ul className="mt-3 space-y-2.5 text-sm text-muted">
                    <li className="flex gap-2.5">
                      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold-dark" />
                      Klienti paguan përpara punës; shuma qëndron e bllokuar te
                      Zgjoi.
                    </li>
                    <li className="flex gap-2.5">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold-dark" />
                      Pas konfirmimit të klientit, pagesa lirohet automatikisht.
                    </li>
                    <li className="flex gap-2.5">
                      <Landmark size={16} className="mt-0.5 shrink-0 text-gold-dark" />
                      Zgjoi mban {KOMISIONI}% komision; {100 - KOMISIONI}% shkon në
                      llogarinë tënde.
                    </li>
                  </ul>
                </div>

                <label className="flex items-start gap-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={form.terms}
                    onChange={(e) => set("terms", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#FFB800]"
                  />
                  <span>
                    Pranoj kushtet e përdorimit dhe politikën e privatësisë së
                    Zgjoit, përfshirë komisionin prej {KOMISIONI}% për çdo punë të
                    përfunduar.
                  </span>
                </label>
                {errors.terms && <p className={errText}>{errors.terms}</p>}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-muted transition-colors enabled:hover:border-gold enabled:hover:text-gold-dark disabled:opacity-40"
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
                {step === steps.length - 1 ? "Dërgo aplikimin" : "Vazhdo"}
                {!sending && step < steps.length - 1 && <ArrowRight size={16} />}
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">
            Ke tashmë llogari?{" "}
            <Link href="/hyr" className="font-semibold text-gold-dark">
              Hyr këtu
            </Link>
          </p>
        </div>

        {/* Aside */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-white p-6 shadow-card">
            <div className="flex justify-center">
              <HexOutline size={120} stroke="#FFB800" strokeWidth={2.5} fill="#FFF3CF">
                <Bee size={48} className="animate-bee-hover" />
              </HexOutline>
            </div>
            <h2 className="mt-4 text-center text-base font-extrabold text-ink">
              Çfarë përfiton
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {[
                "Regjistrim falas, pa tarifë mujore",
                "Kërkesa nga klientë në qytetin tënd",
                "Komision vetëm nga punët e kryera",
                "Pagesa përmes bankës, pa para në dorë",
                "Profil me vlerësime që sjell punë të re",
              ].map((b) => (
                <li key={b} className="flex gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold-dark" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
