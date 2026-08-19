"use client";

import { useEffect, useRef } from "react";

/* On phones, nudge any horizontally scrollable belt inside this wrapper
   along on its own, looping back to the start. Touching it pauses the
   drift so people can browse by hand. */
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
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = wrap.current;
    if (!root) return;

    // the scrollable strip inside the belt
    const belts = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
      (el) => el.scrollWidth > el.clientWidth + 24
    );
    if (belts.length === 0) return;

    let paused = false;
    let raf = 0;
    let last = performance.now();

    const pause = () => { paused = true; };
    const resume = () => { setTimeout(() => { paused = false; }, 2500); };

    belts.forEach((b) => {
      b.addEventListener("touchstart", pause, { passive: true });
      b.addEventListener("touchend", resume, { passive: true });
    });

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused) {
        belts.forEach((b) => {
          const max = b.scrollWidth - b.clientWidth;
          if (max <= 0) return;
          const next = b.scrollLeft + speed * dt;
          b.scrollLeft = next >= max - 1 ? 0 : next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      belts.forEach((b) => {
        b.removeEventListener("touchstart", pause);
        b.removeEventListener("touchend", resume);
      });
    };
  }, [speed]);

  return <div ref={wrap}>{children}</div>;
}
