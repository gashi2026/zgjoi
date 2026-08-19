"use client";

import { useEffect, useRef, useState } from "react";
import { Bee } from "./Brand";

export type Stop = { x: number; y: number; name: string };

/* Catmull-Rom: a smooth curve that passes through every point, so the
   bee sweeps through the icons on a continuous flight path instead of
   travelling in straight hops. */
function spline(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

export default function CombBee({ stops, size }: { stops: Stop[]; size: number }) {
  const beeRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const node = beeRef.current;
    if (node === null || stops.length < 4) return;

    const step = stops.length % 3 === 0 ? 4 : 3;
    const route = stops.map((_, i) => stops[(i * step) % stops.length]);
    const n = route.length;

    const SPEED = 0.42;        // segments per second — a lazy, steady drift
    const NEAR = size * 0.55;  // how close counts as "over" an icon

    let raf = 0;
    const start = performance.now();
    let shown: string | null = null;

    const frame = (now: number) => {
      const elapsed = (now - start) / 1000;
      const travelled = elapsed * SPEED;
      const i = Math.floor(travelled) % n;
      const t = travelled - Math.floor(travelled);

      const a = route[(i - 1 + n) % n];
      const b = route[i];
      const c = route[(i + 1) % n];
      const d = route[(i + 2) % n];

      let x = spline(a.x, b.x, c.x, d.x, t);
      let y = spline(a.y, b.y, c.y, d.y, t);

      // a soft drifting bob, as if riding the air
      x += Math.sin(elapsed * 1.5) * 4;
      y += Math.cos(elapsed * 1.9) * 5;

      // lean into the direction of travel
      const t2 = Math.min(1, t + 0.04);
      const nx = spline(a.x, b.x, c.x, d.x, t2);
      const tilt = Math.max(-12, Math.min(12, (nx - x) * 1.8));

      node.style.transform = `translate(${x}px, ${y}px) rotate(${tilt}deg)`;

      let over: string | null = null;
      for (const s of stops) {
        if (Math.hypot(x - s.x, y - s.y) < NEAR) {
          over = s.name;
          break;
        }
      }
      if (over !== shown) {
        shown = over;
        setLabel(over);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stops, size]);

  if (stops.length < 4) return null;

  return (
    <div
      ref={beeRef}
      className="pointer-events-none absolute left-0 top-0 z-30"
      style={{ width: size, height: size, willChange: "transform" }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <Bee size={Math.round(size * 0.58)} />
      </span>

      <span
        className="absolute left-1/2 top-full whitespace-nowrap rounded-full border border-gold bg-white px-2.5 py-1 text-[11px] font-bold text-ink shadow-lift transition-opacity duration-200"
        style={{ opacity: label ? 1 : 0, transform: "translate(-50%, 3px)" }}
      >
        {label ?? ""}
      </span>
    </div>
  );
}
