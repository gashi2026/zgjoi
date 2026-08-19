"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

type Cat = { slug: string; name: string; icon: string };

type Placed = {
  key: string;
  cat: Cat | null;   // null = faint filler
  bee?: boolean;
  x: number;
  y: number;
  honey: boolean;
};

const ROWS = 4;

export default function MobileHexBelt({
  cats,
  size = 52,
  speed = 24, // pixels per second, right → left
}: {
  cats: Cat[];
  size?: number;
  speed?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const [callout, setCallout] = useState<{ key: string; name: string; x: number; y: number } | null>(null);

  const h = size * RATIO;
  const dx = size;        // step between cells in the same row
  const dy = h * 0.75;    // step between rows

  /* Exactly the comb's own tiling: rows step down by 3/4 of a hex and
     every other row shifts half a step across, so the cells interlock
     instead of stacking on top of one another. */
  const columns = Math.max(8, Math.ceil((cats.length + 8) / ROWS));
  const cells: Placed[] = [];
  let n = 0;
  for (let col = 0; col < columns; col++) {
    for (let row = 0; row < ROWS; row++) {
      const x = col * dx + (row % 2 === 1 ? dx / 2 : 0);
      const y = row * dy;
      const honey = (col * 2 + row) % 3 === 0;
      const gap = (col * 3 + row * 2) % 7 === 0;   // scattered empty cells
      const bee = col === 2 && row === 1;

      if (bee) {
        cells.push({ key: `b-${col}-${row}`, cat: null, bee: true, x, y, honey });
      } else if (gap || n >= cats.length) {
        cells.push({ key: `f-${col}-${row}`, cat: null, x, y, honey });
      } else {
        cells.push({ key: `c-${col}-${row}`, cat: cats[n++], x, y, honey });
      }
    }
  }

  const groupWidth = columns * dx;
  const beltHeight = (ROWS - 1) * dy + h;
  const TOP_ROOM = 78; // space above the belt for the call-outs

  useEffect(() => {
    const track = trackRef.current;
    if (track === null) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rate = calm ? speed * 0.45 : speed;

    let raf = 0;
    let prev = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      offset.current -= rate * dt;
      if (offset.current <= -groupWidth) offset.current += groupWidth;
      track.style.transform = `translate3d(${offset.current}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [groupWidth, speed]);

  /* A call-out pops up on a random icon that's on screen right now. */
  useEffect(() => {
    const named = cells.filter((c) => c.cat !== null);
    if (named.length === 0) return;

    const pick = () => {
      const viewW = frameRef.current?.clientWidth ?? 360;
      const left = -offset.current;
      const visible = named.filter((c) => c.x > left + 8 && c.x < left + viewW - 150);
      const pool = visible.length > 0 ? visible : named;
      const c = pool[Math.floor(Math.random() * pool.length)];
      setCallout({ key: `${c.key}-${Date.now()}`, name: c.cat!.name, x: c.x, y: c.y });
      window.setTimeout(() => setCallout(null), 2600);
    };

    const first = window.setTimeout(pick, 900);
    const loop = window.setInterval(pick, 3400);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells.length]);

  const renderCell = (c: Placed, suffix: string) => {
    if (c.bee) {
      return (
        <div key={c.key + suffix} className="absolute z-20" style={{ left: c.x, top: c.y, width: size, height: h }}>
          <BeeCell size={size} height={h} />
        </div>
      );
    }

    if (c.cat === null) {
      return (
        <div
          key={c.key + suffix}
          className="absolute"
          style={{ left: c.x, top: c.y, width: size, height: h, opacity: 0.55 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 100 115.47" width={size} height={h}>
            <path
              d={HEX_D}
              fill={c.honey ? "#FFFAEC" : "transparent"}
              stroke="#F2E9D4"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    }

    return (
      <Link
        key={c.key + suffix}
        href={`/kerko?kategoria=${c.cat.slug}`}
        aria-label={`${c.cat.name} — shiko profesionistët`}
        draggable={false}
        className="absolute z-10 active:scale-95"
        style={{ left: c.x, top: c.y, width: size, height: h }}
      >
        <svg
          viewBox="0 0 100 115.47"
          width={size}
          height={h}
          className="drop-shadow-[0_4px_10px_rgba(232,157,0,0.12)]"
          aria-hidden="true"
        >
          <path
            d={HEX_D}
            fill={c.honey ? "#FFF3CF" : "#FFFFFF"}
            stroke="#FFB800"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-gold-dark">
          <CategoryIcon name={c.cat.icon} size={21} strokeWidth={1.8} className="text-gold-dark" />
        </span>
      </Link>
    );
  };

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden"
      style={{ height: beltHeight + TOP_ROOM, marginInline: "-1rem" }}
      aria-label="Kategoritë e shërbimeve"
    >
      <style>{`
        @keyframes callout-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes callout-draw {
          from { stroke-dashoffset: 130 }
          to   { stroke-dashoffset: 0 }
        }
        @keyframes callout-glow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(255,184,0,0.8)) }
          50%      { filter: drop-shadow(0 0 8px rgba(255,184,0,1)) }
        }
      `}</style>

      <div
        ref={trackRef}
        className="absolute left-0 will-change-transform"
        style={{ top: TOP_ROOM, width: groupWidth * 2, height: beltHeight }}
      >
        {cells.map((c) => renderCell(c, "-a"))}
        <div className="absolute left-0 top-0" style={{ transform: `translateX(${groupWidth}px)` }}>
          {cells.map((c) => renderCell(c, "-b"))}
        </div>

        {/* call-out: a shining line lifting off the cell, name resting on it */}
        {callout && (
          <div
            key={callout.key}
            className="pointer-events-none absolute z-30"
            style={{
              left: callout.x + size / 2,
              top: callout.y - 62,
              width: 132,
              height: 70,
              animation: "callout-in 260ms ease-out both",
            }}
          >
            <svg
              width="132"
              height="70"
              viewBox="0 0 132 70"
              className="absolute inset-0"
              style={{ animation: "callout-glow 1.8s ease-in-out infinite" }}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="calloutShine" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E89D00" />
                  <stop offset="55%" stopColor="#FFD466" />
                  <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>
              </defs>
              <path
                d="M6 64 L34 30 L126 30"
                fill="none"
                stroke="url(#calloutShine)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="130"
                style={{ animation: "callout-draw 520ms ease-out both" }}
              />
              <circle cx="6" cy="64" r="4.5" fill="#FFFFFF" stroke="#FFB800" strokeWidth="2" />
            </svg>

            {/* the name sits directly on top of the horizontal line */}
            <span
              className="absolute whitespace-nowrap text-[12px] font-extrabold text-ink"
              style={{ left: 36, top: 30 - 19 }}
            >
              {callout.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
