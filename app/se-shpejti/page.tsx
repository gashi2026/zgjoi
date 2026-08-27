"use client";

import { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";

// ⬇️ Change this to match your logo's filename in the /public folder.
//    A file at public/logo.png is written here as "/logo.png".
const LOGO_SRC = "/logo.png";

export default function SeShpejtiPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [fjalekalimi, setFjalekalimi] = useState("");
  const [gabim, setGabim] = useState("");
  const [duke, setDuke] = useState(false);

  async function hyr() {
    if (!fjalekalimi || duke) return;
    setDuke(true);
    setGabim("");
    try {
      const res = await fetch("/api/hyrje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fjalekalimi }),
      });
      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json().catch(() => null);
        setGabim(data?.mesazhi ?? "Fjalëkalimi nuk është i saktë.");
        setDuke(false);
      }
    } catch {
      setGabim("Diçka shkoi keq. Provoni përsëri.");
      setDuke(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFCF5] px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {/* Your logo */}
        <img
          src={LOGO_SRC}
          alt="Zgjoi"
          className="mb-8 h-24 w-auto object-contain"
        />

        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
          Zgjoi
        </h1>

        <div className="mt-3 h-1 w-16 rounded-full bg-[#FFB800]" />

        <p className="mt-6 text-xl font-semibold text-neutral-800">
          Po vjen së shpejti
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
          Zgjoi po ndërtohet — platforma që ju lidh me profesionistë të
          verifikuar vendorë në Kosovë. Na vizitoni përsëri së shpejti.
        </p>

        {/* Discreet team access */}
        <div className="mt-12 w-full">
          {!showLogin ? (
            <button
              onClick={() => setShowLogin(true)}
              className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB800] focus-visible:ring-offset-2"
            >
              <Lock className="h-3.5 w-3.5" />
              Hyrje për ekipin
            </button>
          ) : (
            <div className="mx-auto flex w-full max-w-xs flex-col gap-3">
              <div className="flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm focus-within:border-[#FFB800] focus-within:ring-2 focus-within:ring-[#FFB800]/30">
                <input
                  type="password"
                  autoFocus
                  value={fjalekalimi}
                  onChange={(e) => setFjalekalimi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && hyr()}
                  placeholder="Fjalëkalimi"
                  className="w-full bg-transparent px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none"
                />
                <button
                  onClick={hyr}
                  disabled={duke}
                  aria-label="Hyr"
                  className="flex items-center bg-[#FFB800] px-4 text-neutral-900 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {gabim && (
                <p className="text-xs font-medium text-red-600">{gabim}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
