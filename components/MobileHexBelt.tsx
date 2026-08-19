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
  speed = 26, // pixels per second, right → left
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
  const dx = size;
  const dy = h * 0.75;

  /* Lay the categories out column by column, four rows deep, with a
     scattering of empty cells and one bee. */
  const cells: Placed[] = [];
  const columns = Math.max(6, Math.ceil((cats.length + 6) / ROWS));
  let n = 0;
  for (let col = 0; col < columns; col++) {
    for (let row = 0; row < ROWS; row++) {
      const gap = (col * 3 + row * 2) % 7 === 0; // breathing holes
      const bee = col === 2 && row === 1;
      const x = col * dx;
      const y = row * dy + (col % 2 === 1 ? dy / 2 : 0);
      const honey = (col * 2 + row) % 3 === 0;
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
  const beltHeight = (ROWS - 1) * dy + h + dy / 2;

  /* Continuous right → left drift. */
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

  /* Every couple of seconds, a call-out line pops up on a random icon
     that's currently on screen. */
  useEffect(() => {
    const named = cells.filter((c) => c.cat !== null);
    if (named.length === 0) return;

    const pick = () => {
      const viewW = frameRef.current?.clientWidth ?? 360;
      const left = -offset.current;
      const visible = named.filter(
        (c) => c.x > left + 10 && c.x < left + viewW - 150
      );
      const pool = visible.length > 0 ? visible : named;
      const c = pool[Math.floor(Math.random() * pool.length)];
      setCallout({ key: c.key + Math.random(), name: c.cat!.name, x: c.x, y: c.y });
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
          style={{ left: c.x, top: c.y, width: size, height: h, opacity: 0.5 }}
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
      style={{ height: beltHeight + 74, marginInline: "-1rem" }}
      aria-label="Kategoritë e shërbimeve"
    >
      <style>{`
        @keyframes callout-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes callout-draw {
          from { stroke-dashoffset: 120; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes callout-glow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(255,184,0,0.85)); }
          50%      { filter: drop-shadow(0 0 7px rgba(255,184,0,1)); }
        }
      `}</style>

      <div
        ref={trackRef}
        className="absolute left-0 will-change-transform"
        style={{ top: 74, width: groupWidth * 2, height: beltHeight }}
      >
        {/* two copies so the belt loops seamlessly */}
        {cells.map((c) => renderCell(c, "-a"))}
        <div className="absolute left-0 top-0" style={{ transform: `translateX(${groupWidth}px)` }}>
          {cells.map((c) => renderCell(c, "-b"))}
        </div>

        {/* the call-out: a shining line lifting off the cell to its name */}
        {callout && (
          <div
            key={callout.key}
            className="pointer-events-none absolute z-30"
            style={{
              left: callout.x + size / 2,
              top: callout.y,
              animation: "callout-in 260ms ease-out both",
            }}
          >
            <svg
              width="118"
              height="66"
              viewBox="0 0 118 66"
              className="absolute bottom-0 left-0"
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
                d="M8 58 L34 26 L112 26"
                fill="none"
                stroke="url(#calloutShine)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="120"
                style={{ animation: "callout-draw 520ms ease-out both" }}
              />
              <circle cx="8" cy="58" r="4.5" fill="#FFFFFF" stroke="#FFB800" strokeWidth="2" />
            </svg>
            <span className="absolute bottom-[52px] left-[34px] whitespace-nowrap rounded-full border border-gold bg-white px-2.5 py-1 text-[11px] font-bold text-ink shadow-lift">
              {callout.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
