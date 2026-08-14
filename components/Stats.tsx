"use client";

import { useEffect, useRef, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import { stats } from "@/lib/data";

/* Splits "10K+" into 10 and "K+", "4.9★" into 4.9 and "★". */
function parseValue(raw: string) {
  const m = raw.match(/^([\d.,]+)(.*)$/);
  if (!m) return { target: null as number | null, suffix: raw, decimals: 0 };
  const numText = m[1].replace(/,/g, "");
  const target = parseFloat(numText);
  const decimals = numText.includes(".") ? numText.split(".")[1].length : 0;
  return { target: Number.isFinite(target) ? target : null, suffix: m[2], decimals };
}

function CountUp({ value }: { value: string }) {
  const { target, suffix, decimals } = parseValue(value);
  const [display, setDisplay] = useState(target === null ? value : `0${suffix}`);
  const ref = useRef<HTMLParagraphElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (target === null || done.current) return;
    const node = ref.current;
    if (!node) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      done.current = true;
      return;
    }

    const run = () => {
      done.current = true;
      const duration = 1600;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        // ease-out cubic: fast at first, gently settling on the final number
        const eased = 1 - Math.pow(1 - p, 3);
        const current = target * eased;
        setDisplay(`${current.toFixed(decimals)}${suffix}`);
        if (p < 1) requestAnimationFrame(tick);
        else setDisplay(value); // land exactly on the real figure
      };
      requestAnimationFrame(tick);
    };

    // only count once the numbers are actually on screen
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !done.current) {
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [target, suffix, decimals, value]);

  return (
    <p
      ref={ref}
      className="text-xl font-extrabold tracking-tight text-ink tabular-nums sm:text-2xl"
    >
      {display}
    </p>
  );
}

export default function Stats() {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 sm:gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-cream sm:h-12 sm:w-12">
              <CategoryIcon name={s.icon} size={20} />
            </span>
            <div>
              <CountUp value={s.value} />
              <p className="text-xs text-muted sm:text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
