"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bee } from "./Brand";
import { HEX_D } from "@/lib/hex";

type Flyer = {
  id: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  bob: number;
};

function makeSwarm(seed: number): Flyer[] {
  return Array.from({ length: 14 }, (_, i) => ({
    id: seed * 100 + i,
    top: 6 + Math.random() * 78,
    size: 26 + Math.random() * 30,
    duration: 2.1 + Math.random() * 1.6,
    delay: Math.random() * 0.9,
    bob: 0.45 + Math.random() * 0.4,
  }));
}

export default function BeeCell({ size, height }: { size: number; height: number }) {
  const [swarm, setSwarm] = useState<Flyer[]>([]);
  const [mounted, setMounted] = useState(false);
  const seed = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const release = () => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    seed.current += 1;
    setSwarm(makeSwarm(seed.current));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSwarm([]), 4200);
  };

  return (
    <>
      <button
        type="button"
        onClick={release}
        aria-label="Lësho bletët"
        className="group absolute inset-0 cursor-pointer"
        style={{ width: size, height }}
      >
        <svg
          viewBox="0 0 100 115.47"
          width={size}
          height={height}
          className="drop-shadow-[0_6px_14px_rgba(232,157,0,0.12)] transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95"
          aria-hidden="true"
        >
          <path
            d={HEX_D}
            fill="#FFF3CF"
            stroke="#FFB800"
            strokeWidth={2.5}
            strokeLinejoin="round"
            className="transition-colors duration-200 group-hover:fill-[#FFE9A8] group-hover:stroke-[#E89D00]"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          <Bee size={40} className="animate-bee-hover" />
        </span>
        <span className="pointer-events-none absolute bottom-full left-1/2 z-30 -mb-1.5 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:mb-0.5 group-hover:opacity-100">
          <span className="block whitespace-nowrap rounded-full border border-gold bg-white px-3 py-1 text-xs font-bold text-ink shadow-lift">
            Kliko mua
          </span>
          <span className="mx-auto block h-3.5 w-[2px] bg-gold" />
        </span>
      </button>

      {mounted && swarm.length > 0 && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
          {swarm.map((f) => (
            <span
              key={f.id}
              className="absolute left-0 animate-swarm-fly"
              style={{ top: `${f.top}vh`, animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s` }}
            >
              <span className="block animate-swarm-bob" style={{ animationDuration: `${f.bob}s` }}>
                <Bee size={f.size} />
              </span>
            </span>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
