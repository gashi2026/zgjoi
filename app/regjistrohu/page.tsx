"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/Brand";

export default function RegjistrohuPage() {
  const [name, setName] = useState("");
  const [personalNo, setPersonalNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"name" | "personalNo" | "email" | "password" | "agree", string>>
  >({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Shkruani emrin tuaj të plotë.";
    if (!/^\d{10}$/.test(personalNo))
      next.personalNo = "Numri personal duhet të ketë saktësisht 10 shifra.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Shkruani një adresë email të vlefshme.";
    if (password.length < 6)
      next.password = "Fjalëkalimi duhet të ketë të paktën 6 karaktere.";
    if (!agree) next.agree = "Duhet të pranoni kushtet e përdorimit.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setStatus("sending");
    window.setTimeout(() => setStatus("done"), 900);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream px-4 py-14">
      <div className="w-full max-w-md animate-fade-up rounded-3xl border border-line bg-white p-8 shadow-card sm:p-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={44} />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
            Krijo llogarinë tënde
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Llogari klienti — falas, brenda një minute.
          </p>
        </div>

        {status === "done" ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <CheckCircle2 size={44} className="text-gold" />
            <h2 className="mt-3 text-lg font-bold text-ink">
              Mirë se erdhe në Zgjoi{name ? `, ${name.split(" ")[0]}` : ""}!
            </h2>
            <p className="mt-2 text-sm text-muted">
              Kjo është një version demonstrues — llogaria nuk ruhet ende në
              server. Vazhdoni të eksploroni platformën!
            </p>
            <Link
              href="/llogaria"
              className="mt-5 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark"
            >
              Shko te llogaria ime
            </Link>
            <Link href="/kerko" className="mt-3 text-sm font-semibold text-gold-dark">
              Gjej shërbim
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="r-name" className="text-sm font-semibold text-ink">
                Emri i plotë
              </label>
              <input
                id="r-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="p.sh. Artan Berisha"
                className={`mt-1.5 w-full rounded-xl border bg-cream px-4 py-3 text-sm outline-none transition-colors focus:border-gold ${
                  errors.name ? "border-red-400" : "border-line"
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="r-pn" className="text-sm font-semibold text-ink">
                Numri personal
              </label>
              <input
                id="r-pn"
                inputMode="numeric"
                value={personalNo}
                onChange={(e) =>
                  setPersonalNo(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="10 shifra"
                aria-describedby="r-pn-help"
                className={`mt-1.5 w-full rounded-xl border bg-cream px-4 py-3 text-sm outline-none transition-colors focus:border-gold ${
                  errors.personalNo ? "border-red-400" : "border-line"
                }`}
              />
              {errors.personalNo ? (
                <p className="mt-1 text-xs text-red-600">{errors.personalNo}</p>
              ) : (
                <p id="r-pn-help" className="mt-1 text-xs text-muted">
                  {personalNo.length}/10 shifra · përdoret vetëm për
                  konfirmimin e profilit dhe nuk shfaqet publikisht.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="r-email" className="text-sm font-semibold text-ink">
                Email
              </label>
              <input
                id="r-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="emri@shembull.com"
                className={`mt-1.5 w-full rounded-xl border bg-cream px-4 py-3 text-sm outline-none transition-colors focus:border-gold ${
                  errors.email ? "border-red-400" : "border-line"
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="r-password" className="text-sm font-semibold text-ink">
                Fjalëkalimi
              </label>
              <input
                id="r-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Të paktën 6 karaktere"
                className={`mt-1.5 w-full rounded-xl border bg-cream px-4 py-3 text-sm outline-none transition-colors focus:border-gold ${
                  errors.password ? "border-red-400" : "border-line"
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2.5 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-gold"
                />
                <span>
                  Pranoj{" "}
                  <Link href="/rreth-nesh" className="font-semibold text-gold-dark hover:underline">
                    kushtet e përdorimit
                  </Link>{" "}
                  dhe{" "}
                  <Link href="/rreth-nesh" className="font-semibold text-gold-dark hover:underline">
                    politikën e privatësisë
                  </Link>
                  .
                </span>
              </label>
              {errors.agree && <p className="mt-1 text-xs text-red-600">{errors.agree}</p>}
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark disabled:opacity-60"
            >
              {status === "sending" && <Loader2 size={16} className="animate-spin" />}
              {status === "sending"
                ? "Duke krijuar llogarinë..."
                : "Regjistrohu falas"}
            </button>

            <p className="pt-2 text-center text-sm text-muted">
              Keni llogari?{" "}
              <Link href="/hyr" className="font-semibold text-gold-dark hover:underline">
                Hyr
              </Link>
            </p>
            <p className="text-center text-sm text-muted">
              Je mjeshtër?{" "}
              <Link
                href="/regjistrohu-profesionist"
                className="font-semibold text-gold-dark hover:underline"
              >
                Regjistrohu si profesionist
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
