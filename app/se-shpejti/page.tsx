"use client";

import { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";

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
    <main className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center overflow-y-auto bg-[#FFFCF5] px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {/* Zgjoi honeycomb mark — drawn inline, no image file needed */}
        <svg
          viewBox="-22 -22 390 394"
          role="img"
          aria-label="Zgjoi"
          className="mb-7 h-28 w-auto"
        >
          <g
            fill="none"
            stroke="#E9A93A"
            strokeWidth="26"
            strokeLinejoin="round"
          >
            {/* bottom cell, filled */}
            <polygon
              points="173.2,150 259.8,200 259.8,300 173.2,350 86.6,300 86.6,200"
              fill="#FBEDBE"
            />
            {/* top-left cell */}
            <polygon points="86.6,0 173.2,50 173.2,150 86.6,200 0,150 0,50" />
            {/* top-right cell */}
            <polygon points="259.8,0 346.4,50 346.4,150 259.8,200 173.2,150 173.2,50" />
          </g>
        </svg>

        <h1 className="text-5xl font-extrabold tracking-tight text-neutral-900 sm:text-6xl">
          Zgjoi
        </h1>

        <p className="mt-5 text-xl font-semibold text-[#E9A93A]">
          Së shpejti
        </p>

        {/* Discreet team access */}
        <div className="mt-14 w-full">
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
