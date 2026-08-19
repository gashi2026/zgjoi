"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bee } from "./Brand";
import { HEX_D } from "@/lib/hex";

type Flyer = {
  id: number;
  hx: number;  // heart point, vw
  hy: number;  // heart point, vh
  startX: number;
  startY: number;
  outX: number;
  outY: number;
  size: number;
  delay: number;
};

/* Parametric heart, normalised to [0,1] */
function heartPoint(t: number): [number, number] {
  const a = t * 2 * Math.PI;
  const x = 16 * Math.pow(Math.sin(a), 3);
  const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
  return [(x + 16) / 32, (y + 13) / 31];
}

function makeSwarm(seed: number): Flyer[] {
  const count = 22;
  return Array.from({ length: count }, (_, i) => {
    const [nx, ny] = heartPoint(i / count);
    return {
      id: seed * 100 + i,
      hx: 32 + nx * 36,   // heart occupies 32–68 vw
      hy: 18 + ny * 50,   // and 18–68 vh
      startX: -12,
      startY: 10 + Math.random() * 70,
      outX: 105 + Math.random() * 10,
      outY: -15 + Math.random() * 20,
      size: 20 + Math.random() * 16,
      delay: i * 0.05,
    };
  });
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

  /* Reduced motion used to cancel this outright — now the heart still
     forms, it simply takes its time. */
  const release = () => {
    const calm =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    seed.current += 1;
    setSwarm(makeSwarm(seed.current));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSwarm([]), calm ? 6500 : 5000);
  };

  const calmNow =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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
          <Bee size={Math.round(size * 0.5)} className="animate-bee-hover" />
        </span>
        <span className="pointer-events-none absolute bottom-full left-1/2 z-30 -mb-1.5 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:mb-0.5 group-hover:opacity-100">
          <span className="block whitespace-nowrap rounded-full border border-gold bg-white px-3 py-1 text-xs font-bold text-ink shadow-lift">
            Kliko
          </span>
          <span className="mx-auto block h-3.5 w-[2px] bg-gold" />
        </span>
      </button>

      {mounted && swarm.length > 0 && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
          <style>{`
            @keyframes bee-journey {
              0%   { transform: translate(var(--sx), var(--sy)) scale(0.4); opacity: 0; }
              8%   { opacity: 1; }
              26%  { transform: translate(var(--hx), var(--hy)) scale(1); opacity: 1; }
              62%  { transform: translate(var(--hx), var(--hy)) scale(1); opacity: 1; }
              70%  { transform: translate(calc(var(--hx) + 1vw), calc(var(--hy) - 2vh)) scale(1); opacity: 1; }
              96%  { opacity: 1; }
              100% { transform: translate(var(--ox), var(--oy)) scale(0.5); opacity: 0; }
            }
            @keyframes bee-wiggle {
              0%, 100% { transform: translateY(0) rotate(-4deg); }
              50%      { transform: translateY(-5px) rotate(4deg); }
            }
          `}</style>
          {swarm.map((f) => (
            <span
              key={f.id}
              className="absolute left-0 top-0"
              style={{
                "--sx": `${f.startX}vw`,
                "--sy": `${f.startY}vh`,
                "--hx": `${f.hx}vw`,
                "--hy": `${f.hy}vh`,
                "--ox": `${f.outX}vw`,
                "--oy": `${f.outY}vh`,
                animation: `bee-journey ${calmNow ? 6 : 4.4}s cubic-bezier(0.4, 0, 0.2, 1) ${f.delay}s both`,
              } as React.CSSProperties}
            >
              <span style={{ display: "block", animation: "bee-wiggle 0.5s ease-in-out infinite" }}>
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
