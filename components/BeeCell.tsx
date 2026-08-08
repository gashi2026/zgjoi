"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bee } from "./Brand";
import { HEX_D } from "@/lib/hex";

type Flyer = {
  id: number;
  x: number;   // % of viewport width — heart point
  y: number;   // % of viewport height — heart point
  size: number;
  delay: number;
  duration: number;
};

/* Parametric heart — returns normalised (x,y) in [0,1] */
function heartPoint(t: number): [number, number] {
  const a = t * 2 * Math.PI;
  const hx = 16 * Math.pow(Math.sin(a), 3);
  const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
  // hx in [-16,16], hy in [-13,18] → normalise to [0,1]
  return [(hx + 16) / 32, (hy + 13) / 31];
}

function makeSwarm(seed: number): Flyer[] {
  const count = 22;
  return Array.from({ length: count }, (_, i) => {
    const t = i / count;
    const [hx, hy] = heartPoint(t + seed * 0.07);
    // centre the heart in the viewport with some margin
    const cx = 30 + hx * 40; // 30%–70% of width
    const cy = 20 + hy * 55; // 20%–75% of height
    return {
      id: seed * 100 + i,
      x: cx,
      y: cy,
      size: 20 + Math.random() * 18,
      delay: i * 0.07,
      duration: 1.2 + Math.random() * 0.4,
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

  const release = () => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    seed.current += 1;
    setSwarm(makeSwarm(seed.current));
    if (timer.current) clearTimeout(timer.current);
    // stay visible for 2.4 s then fade out
    timer.current = setTimeout(() => setSwarm([]), 3200);
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
            Kliko mua 🐝
          </span>
          <span className="mx-auto block h-3.5 w-[2px] bg-gold" />
        </span>
      </button>

      {mounted && swarm.length > 0 && createPortal(
        <div
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
          aria-hidden="true"
          style={{ animation: "bee-heart-fade 3.2s ease-out forwards" }}
        >
          <style>{`
            @keyframes bee-heart-fade {
              0%   { opacity: 0 }
              15%  { opacity: 1 }
              70%  { opacity: 1 }
              100% { opacity: 0 }
            }
            @keyframes bee-to-heart {
              0%   { transform: translate(-50vw, 60vh) scale(0.3); opacity: 0 }
              40%  { opacity: 1 }
              80%  { opacity: 1 }
              100% { transform: translate(0, 0) scale(1); opacity: 1 }
            }
            @keyframes bee-bob-small {
              0%, 100% { transform: translateY(0) rotate(-5deg); }
              50%       { transform: translateY(-6px) rotate(5deg); }
            }
          `}</style>
          {swarm.map((f) => (
            <span
              key={f.id}
              className="absolute"
              style={{
                left: `${f.x}vw`,
                top: `${f.y}vh`,
                animation: `bee-to-heart ${f.duration}s ease-out ${f.delay}s both`,
              }}
            >
              <span style={{ display: "block", animation: `bee-bob-small 0.6s ease-in-out infinite` }}>
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
