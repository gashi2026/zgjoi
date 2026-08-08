"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bee } from "./Brand";
import { HEX_D } from "@/lib/hex";

type Flyer = {
  id: number;
  size: number;
  /* off-screen start, heart position, off-screen exit — all in px */
  x0: number;
  y0: number;
  hx: number;
  hy: number;
  x1: number;
  y1: number;
  duration: number;
  delay: number;
  bob: number;
  bobDelay: number;
};

const COUNT = 28;

/**
 * Bees enter from the left, settle onto the outline of a heart, hold it
 * for a beat or two, then continue off to the right.
 * Heart curve: x = 16sin³t, y = 13cos t − 5cos2t − 2cos3t − cos4t
 */
function makeSwarm(seed: number): Flyer[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = vw / 2;
  const cy = vh * 0.46;
  const s = Math.min(vw, vh) / 42; // heart spans ~76% of the shorter side

  return Array.from({ length: COUNT }, (_, i) => {
    /* even spread around the curve, with a little jitter so it never
       looks like a stencil */
    const t = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.06;
    const jitter = 1 + (Math.random() - 0.5) * 0.05;
    const size = 22 + Math.random() * 14;

    const hx =
      cx + s * 16 * Math.pow(Math.sin(t), 3) * jitter - size / 2;
    const hy =
      cy -
      s *
        (13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)) *
        jitter -
      size / 2;

    return {
      id: seed * 1000 + i,
      size,
      x0: -(140 + Math.random() * 380),
      y0: Math.random() * vh,
      hx,
      hy,
      x1: vw + 160 + Math.random() * 320,
      y1: hy + (Math.random() - 0.5) * vh * 0.5,
      duration: 4.4 + Math.random() * 0.5,
      delay: Math.random() * 0.28,
      bob: 0.45 + Math.random() * 0.35,
      bobDelay: Math.random() * 0.5,
    };
  });
}

export default function BeeCell({
  size,
  height,
}: {
  size: number;
  height: number;
}) {
  const [swarm, setSwarm] = useState<Flyer[]>([]);
  const [mounted, setMounted] = useState(false);
  const seed = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const release = () => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    seed.current += 1;
    setSwarm(makeSwarm(seed.current));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSwarm([]), 5600);
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

        {/* hover hint, same pill + gold line as the service cells */}
        <span className="pointer-events-none absolute bottom-full left-1/2 z-30 -mb-1.5 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:mb-0.5 group-hover:opacity-100">
          <span className="block whitespace-nowrap rounded-full border border-gold bg-white px-3 py-1 text-xs font-bold text-ink shadow-lift">
            Kliko mua
          </span>
          <span className="mx-auto block h-3.5 w-[2px] bg-gold" />
        </span>
      </button>

      {mounted &&
        swarm.length > 0 &&
        createPortal(
          <div
            className="swarm-layer"
            key={seed.current}
            aria-hidden="true"
          >
            {swarm.map((f) => (
              <span
                key={f.id}
                className="swarm-bee"
                style={
                  {
                    "--x0": `${f.x0}px`,
                    "--y0": `${f.y0}px`,
                    "--hx": `${f.hx}px`,
                    "--hy": `${f.hy}px`,
                    "--x1": `${f.x1}px`,
                    "--y1": `${f.y1}px`,
                    "--dur": `${f.duration}s`,
                    "--delay": `${f.delay}s`,
                    "--bob": `${f.bob}s`,
                    "--bob-delay": `${f.bobDelay}s`,
                  } as React.CSSProperties
                }
              >
                <span>
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
