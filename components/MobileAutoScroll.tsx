"use client";

import { useEffect, useRef } from "react";

/* On phones, keep any horizontally scrollable belt inside this wrapper
   drifting on its own. Touching it pauses the drift so people can
   browse by hand. */
export default function MobileAutoScroll({
  speed = 28, // pixels per second
  children,
}: {
  speed?: number;
  children: React.ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    const root = wrap.current;
    if (!root) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pxPerSec = calm ? speed * 0.4 : speed;

    let raf = 0;
    let last = performance.now();
    let paused = false;
    let belts: HTMLElement[] = [];

    const findBelts = () => {
      const all = Array.from(root.querySelectorAll<HTMLElement>("div, ul, section"));
      belts = all.filter((el) => {
        if (el.scrollWidth <= el.clientWidth + 12) return false;
        const ox = getComputedStyle(el).overflowX;
        return ox === "auto" || ox === "scroll";
      });
      belts.forEach((b) => {
        b.addEventListener("touchstart", pause, { passive: true });
        b.addEventListener("touchend", resume, { passive: true });
      });
    };

    const pause = () => { paused = true; };
    const resume = () => { setTimeout(() => { paused = false; }, 2500); };

    // give the belt a moment to render its cards before measuring
    const scan = setTimeout(findBelts, 400);
    const rescan = setTimeout(() => { if (belts.length === 0) findBelts(); }, 1500);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!paused) {
        belts.forEach((b) => {
          const max = b.scrollWidth - b.clientWidth;
          if (max <= 0) return;
          const next = b.scrollLeft + pxPerSec * dt;
          b.scrollLeft = next >= max - 1 ? 0 : next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(scan);
      clearTimeout(rescan);
      belts.forEach((b) => {
        b.removeEventListener("touchstart", pause);
        b.removeEventListener("touchend", resume);
      });
    };
  }, [speed]);

  return <div ref={wrap}>{children}</div>;
}
