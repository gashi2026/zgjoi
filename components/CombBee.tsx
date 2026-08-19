"use client";

import { useEffect, useState } from "react";
import { Bee } from "./Brand";

export type Stop = { x: number; y: number; name: string };

/* A bee that tours the comb: it drifts from icon to icon and, as it
   settles over one, that category's name pops up beneath it. */
export default function CombBee({ stops, size }: { stops: Stop[]; size: number }) {
  const [i, setI] = useState(0);
  const [showName, setShowName] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [calm, setCalm] = useState(false); // reduced-motion: jump instead of glide

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  useEffect(() => {
    if (!mounted || stops.length === 0) return;

    let alive = true;
    const dwell = calm ? 4000 : 2600;
    const settle = calm ? 200 : 1400;

    const first = setTimeout(() => alive && setShowName(true), settle);
    const hop = setInterval(() => {
      if (!alive) return;
      setShowName(false);
      setI((v) => (v + 1) % stops.length);
      setTimeout(() => alive && setShowName(true), settle);
    }, dwell);

    return () => {
      alive = false;
      clearInterval(hop);
      clearTimeout(first);
    };
  }, [mounted, calm, stops.length]);

  if (stops.length === 0) return null;
  const stop = stops[Math.min(i, stops.length - 1)];

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30"
      style={{
        transform: `translate(${stop.x}px, ${stop.y}px)`,
        transition: calm ? undefined : "transform 1.4s cubic-bezier(0.45, 0, 0.25, 1)",
        width: size,
        height: size,
      }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="block animate-bee-hover">
          <Bee size={Math.round(size * 0.62)} />
        </span>
      </span>

      <span
        className="absolute left-1/2 top-full whitespace-nowrap rounded-full border border-gold bg-white px-2.5 py-1 text-[11px] font-bold text-ink shadow-lift transition-all duration-300"
        style={{
          opacity: showName ? 1 : 0,
          transform: `translate(-50%, ${showName ? "2px" : "-4px"})`,
        }}
      >
        {stop.name}
      </span>
    </div>
  );
}
