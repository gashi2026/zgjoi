"use client";

import { useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  /** pixels per second */
  speed?: number;
  direction?: "left" | "right";
  /** gap between items, in px */
  gap?: number;
  className?: string;
};

/**
 * Infinite "conveyor belt" row.
 * - scrolls continuously with requestAnimationFrame
 * - pauses on hover / keyboard focus (pointer devices only)
 * - can be dragged (mouse or touch) to scrub, then resumes
 * - with reduced motion on, it slows down rather than stopping
 */
export default function Marquee({
  children,
  speed = 42,
  direction = "left",
  gap = 16,
  className = "",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const offset = useRef(0);
  const paused = useRef(false);
  const dragging = useRef(false);
  const dragMoved = useRef(0);
  const lastX = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;
    if (!track || !group) return;

    // Reduced motion shouldn't freeze the belt outright — it just takes
    // it down to a gentle crawl.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rate = reduce ? speed * 0.4 : speed;

    const dir = direction === "left" ? -1 : 1;
    let raf = 0;
    let prev = performance.now();

    const span = () => group.offsetWidth + gap;

    const normalize = () => {
      const g = span();
      if (!g) return;
      offset.current = offset.current % g;
      if (offset.current > 0) offset.current -= g;
    };

    const frame = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (!paused.current && !dragging.current) {
        offset.current += dir * rate * dt;
        normalize();
        track.style.transform = `translate3d(${offset.current}px,0,0)`;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [speed, direction, gap]);

  /* ---- drag to scrub ---- */
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragMoved.current = 0;
    lastX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    dragMoved.current += Math.abs(dx);

    const track = trackRef.current;
    const group = groupRef.current;
    if (!track || !group) return;

    const g = group.offsetWidth + gap;
    offset.current += dx;
    offset.current = offset.current % g;
    if (offset.current > 0) offset.current -= g;
    track.style.transform = `translate3d(${offset.current}px,0,0)`;
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  /* swallow the click that ends a real drag, so cards don't navigate */
  const onClickCapture = (e: React.MouseEvent) => {
    if (dragMoved.current > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
    dragMoved.current = 0;
  };

  /* only pause on hover where hovering is a real thing — on a phone the
     "hover" can stick after a tap and freeze the belt for good */
  const hoverPause = (v: boolean) => () => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      paused.current = v;
    }
  };

  return (
    <div
      className={`group/marquee relative overflow-hidden ${className}`}
      onMouseEnter={hoverPause(true)}
      onMouseLeave={hoverPause(false)}
      onFocusCapture={hoverPause(true)}
      onBlurCapture={hoverPause(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      style={{
        touchAction: "pan-y",
        cursor: "grab",
        maskImage:
          "linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)",
      }}
    >
      <div
        ref={trackRef}
        className="flex w-max will-change-transform"
        style={{ gap }}
      >
        <div ref={groupRef} className="flex" style={{ gap }}>
          {children}
        </div>
        <div className="flex" style={{ gap }} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
