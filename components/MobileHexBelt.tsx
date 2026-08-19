"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

type Cat = { slug: string; name: string; icon: string };

type Placed = {
  key: string;
  cat: Cat | null; // null = the bee
  bee?: boolean;
  x: number;
  y: number;
  row: number;
  honey: boolean;
};

type Callout = { key: string; name: string; x: number; y: number; dir: "up" | "down" };

const ROWS = 4;
const TOP_ROOM = 66;    // headroom for the upward call-outs
const BOTTOM_ROOM = 54; // room for the downward ones

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
  const dragging = useRef(false);
  const dragMoved = useRef(0);
  const lastX = useRef(0);
  const [top, setTop] = useState<Callout | null>(null);
  const [bottom, setBottom] = useState<Callout | null>(null);

  const h = size * RATIO;
  const dx = size;
  const dy = h * 0.75;

  /* The comb's own tiling: rows step down 3/4 of a hex, every other row
     shifts half a step across. Every cell carries a category — no gaps. */
  const columns = Math.max(10, Math.ceil(cats.length / ROWS) + 2);
  const cells: Placed[] = [];
  let n = 0;
  for (let col = 0; col < columns; col++) {
    for (let row = 0; row < ROWS; row++) {
      const x = col * dx + (row % 2 === 1 ? dx / 2 : 0);
      const y = row * dy;
      const honey = (col * 2 + row) % 3 === 0;
      const bee = col === 2 && row === 1;
      if (bee) {
        cells.push({ key: `b-${col}-${row}`, cat: null, bee: true, x, y, row, honey });
      } else {
        cells.push({
          key: `c-${col}-${row}`,
          cat: cats[n++ % cats.length],
          x, y, row, honey,
        });
      }
    }
  }

  const groupWidth = columns * dx;
  const beltHeight = (ROWS - 1) * dy + h;

  /* ---- continuous drift, paused while you drag ---- */
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
      if (!dragging.current) {
        offset.current -= rate * dt;
        if (offset.current <= -groupWidth) offset.current += groupWidth;
        if (offset.current > 0) offset.current -= groupWidth;
        track.style.transform = `translate3d(${offset.current}px,0,0)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [groupWidth, speed]);

  /* ---- two call-outs, on their own rhythms ---- */
  useEffect(() => {
    const named = cells.filter((c) => c.cat !== null);
    if (named.length === 0) return;

    const pickFrom = (rows: number[], dir: "up" | "down", set: (c: Callout | null) => void, hold: number) => {
      const viewW = frameRef.current?.clientWidth ?? 360;
      const left = -offset.current;
      const pool = named.filter(
        (c) => rows.includes(c.row) && c.x > left + 8 && c.x < left + viewW - 150
      );
      const fallback = named.filter((c) => rows.includes(c.row));
      const list = pool.length > 0 ? pool : fallback;
      if (list.length === 0) return;
      const c = list[Math.floor(Math.random() * list.length)];
      set({ key: `${c.key}-${Date.now()}`, name: c.cat!.name, x: c.x, y: c.y, dir });
      window.setTimeout(() => set(null), hold);
    };

    const upTick = () => pickFrom([0, 1], "up", setTop, 2600);
    const downTick = () => pickFrom([2, 3], "down", setBottom, 2600);

    const t1 = window.setTimeout(upTick, 700);
    const t2 = window.setTimeout(downTick, 2100);
    const i1 = window.setInterval(upTick, 3600);
    const i2 = window.setInterval(downTick, 4300);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearInterval(i1);
      window.clearInterval(i2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells.length]);

  /* ---- drag to pull the belt either way ---- */
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragMoved.current = 0;
    lastX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const track = trackRef.current;
    if (track === null) return;
    const d = e.clientX - lastX.current;
    lastX.current = e.clientX;
    dragMoved.current += Math.abs(d);
    offset.current += d;
    if (offset.current <= -groupWidth) offset.current += groupWidth;
    if (offset.current > 0) offset.current -= groupWidth;
    track.style.transform = `translate3d(${offset.current}px,0,0)`;
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  /* a real drag shouldn't open the category underneath */
  const onClickCapture = (e: React.MouseEvent) => {
    if (dragMoved.current > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
    dragMoved.current = 0;
  };

  const renderCell = (c: Placed, suffix: string) => {
    if (c.bee) {
      return (
        <div key={c.key + suffix} className="absolute z-20" style={{ left: c.x, top: c.y, width: size, height: h }}>
          <BeeCell size={size} height={h} />
        </div>
      );
    }
    return (
      <Link
        key={c.key + suffix}
        href={`/kerko?kategoria=${c.cat!.slug}`}
        aria-label={`${c.cat!.name} — shiko profesionistët`}
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
          <CategoryIcon name={c.cat!.icon} size={21} strokeWidth={1.8} className="text-gold-dark" />
        </span>
      </Link>
    );
  };

  const renderCallout = (co: Callout) => {
    const up = co.dir === "up";
    return (
      <div
        key={co.key}
        className="pointer-events-none absolute z-30"
        style={{
          left: co.x + size / 2,
          top: up ? co.y - 60 : co.y + h - 10,
          width: 134,
          height: 68,
          animation: "callout-in 260ms ease-out both",
        }}
      >
        <svg
          width="134"
          height="68"
          viewBox="0 0 134 68"
          className="absolute inset-0"
          style={{ animation: "callout-glow 1.8s ease-in-out infinite" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`shine-${up ? "u" : "d"}`} x1="0" y1={up ? "1" : "0"} x2="1" y2={up ? "0" : "1"}>
              <stop offset="0%" stopColor="#E89D00" />
              <stop offset="55%" stopColor="#FFD466" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>
          <path
            d={up ? "M6 62 L34 28 L128 28" : "M6 6 L34 40 L128 40"}
            fill="none"
            stroke={`url(#shine-${up ? "u" : "d"})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="132"
            style={{ animation: "callout-draw 520ms ease-out both" }}
          />
          <circle cx="6" cy={up ? 62 : 6} r="4.5" fill="#FFFFFF" stroke="#FFB800" strokeWidth="2" />
        </svg>

        {/* the name rests on the horizontal stroke */}
        <span
          className="absolute whitespace-nowrap text-[12px] font-extrabold text-ink"
          style={{ left: 36, top: up ? 28 - 19 : 40 - 19 }}
        >
          {co.name}
        </span>
      </div>
    );
  };

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden"
      style={{
        height: beltHeight + TOP_ROOM + BOTTOM_ROOM,
        marginInline: "-1rem",
        touchAction: "pan-y",
        cursor: "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      aria-label="Kategoritë e shërbimeve"
    >
      <style>{`
        @keyframes callout-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes callout-draw { from { stroke-dashoffset: 132 } to { stroke-dashoffset: 0 } }
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

        {top && renderCallout(top)}
        {bottom && renderCallout(bottom)}
      </div>
    </div>
  );
}
