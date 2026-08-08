"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Brand";

export default function HyrPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Shkruani email-in dhe fjalëkalimin.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = data.redirect;
      } else {
        setError(data.message ?? "Email ose fjalëkalim i pasaktë.");
      }
    } catch {
      setError("Ndodhi një gabim. Provo sërish.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream px-4 py-14">
      <div className="w-full max-w-md animate-fade-up rounded-3xl border border-line bg-white p-8 shadow-card sm:p-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={44} />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
            Mirë se u ktheve!
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Hyni në llogarinë tuaj Zgjoi.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="emri@shembull.com"
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none transition-colors focus:border-gold"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-semibold text-ink">
              Fjalëkalimi
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line bg-cream px-4 py-3 pr-12 text-sm outline-none transition-colors focus:border-gold"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark disabled:opacity-60"
          >
            {pending && <Loader2 size={16} className="animate-spin" />}
            {pending ? "Duke hyrë..." : "Hyr"}
          </button>

          <p className="pt-2 text-center text-sm text-muted">
            Nuk keni llogari?{" "}
            <Link href="/regjistrohu" className="font-semibold text-gold-dark hover:underline">
              Regjistrohu falas
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
