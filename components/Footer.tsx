"use client";

import Link from "next/link";
import { useState } from "react";
import { Facebook, Instagram, Linkedin, ArrowRight, Check } from "lucide-react";
import { Logo } from "./Brand";
import { categories } from "@/lib/data";

const columns: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: "Kategoritë",
    items: categories.slice(0, 5).map((c) => ({
      label: c.name,
      href: `/kerko?kategoria=${c.slug}`,
    })),
  },
  {
    title: "Për profesionistët",
    items: [
      { label: "Bëhu profesionist", href: "/profesionistet" },
      { label: "Publiko kërkesë", href: "/kerkesa-e-re" },
      { label: "Paneli i profesionistit", href: "/pro/paneli" },
      { label: "Si funksionon", href: "/si-funksionon" },
      { label: "Udhëzime", href: "/si-funksionon" },
      { label: "Puna të hapura", href: "/kerko" },
    ],
  },
  {
    title: "Mbështetje",
    items: [
      { label: "Qendra e ndihmës", href: "/rreth-nesh" },
      { label: "Siguria", href: "/rreth-nesh" },
      { label: "Kushtet e përdorimit", href: "/rreth-nesh" },
      { label: "Politika e privatësisë", href: "/rreth-nesh" },
    ],
  },
  {
    title: "Kompania",
    items: [
      { label: "Rreth nesh", href: "/rreth-nesh" },
      { label: "Kontakti", href: "/rreth-nesh" },
      { label: "Karriera", href: "/rreth-nesh" },
      { label: "Llogaria ime", href: "/llogaria" },
      { label: "Admin", href: "/admin" },
    ],
  },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      return;
    }
    setState("done");
    setEmail("");
  }

  return (
    <footer className="border-t border-line bg-white pb-24 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-3">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Zgjoi është platforma më e besuar në Kosovë për të gjetur dhe
              punësuar profesionistë lokalë të verifikuar.
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { icon: Facebook, label: "Facebook" },
                { icon: Instagram, label: "Instagram" },
                { icon: Linkedin, label: "LinkedIn" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold hover:text-gold-dark"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-6">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold text-ink">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted transition-colors hover:text-gold-dark"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-bold text-ink">Abonohu për lajme</h3>
            <p className="mt-3 text-sm text-muted">
              Merr lajmet dhe këshillat më të mira në email.
            </p>
            <form onSubmit={subscribe} className="mt-4" noValidate>
              <div className="flex overflow-hidden rounded-full border border-line bg-cream focus-within:border-gold">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setState("idle");
                  }}
                  placeholder="Email juaj"
                  aria-label="Email juaj"
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted"
                />
                <button
                  type="submit"
                  aria-label="Abonohu"
                  className="m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition-colors hover:bg-gold-dark"
                >
                  {state === "done" ? <Check size={16} /> : <ArrowRight size={16} />}
                </button>
              </div>
              {state === "error" && (
                <p className="mt-2 text-xs text-red-600">
                  Shkruani një adresë email të vlefshme.
                </p>
              )}
              {state === "done" && (
                <p className="mt-2 text-xs text-gold-dark">
                  Faleminderit! Jeni abonuar me sukses.
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>© 2026 Zgjoi. Të gjitha të drejtat e rezervuara.</p>
          <div className="flex gap-6">
            <Link href="/rreth-nesh" className="hover:text-gold-dark">
              Privatësia
            </Link>
            <Link href="/rreth-nesh" className="hover:text-gold-dark">
              Kushtet
            </Link>
            <Link href="/rreth-nesh" className="hover:text-gold-dark">
              Kontakti
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
