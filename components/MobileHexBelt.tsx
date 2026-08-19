"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import { Bee } from "./Brand";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

type Cat = { slug: string; name: string; icon: string };

type Placed = {
  key: string;
  cat: Cat | null;  // null = a bee cell
  decor?: boolean;  // bees, purely decorative
  x: number;
  y: number;
  row: number;
  honey: boolean;
};

type Callout = { id: number; name: string; x: number; y: number; dir: "up" | "down" };

const ROWS_TALL = 4;
const ROWS_SHORT = 3;   // phone held sideways — less height to play with
const TOP_ROOM = 66;
const BOTTOM_ROOM = 54;
const TOP_ROOM_SHORT = 46;
const BOTTOM_ROOM_SHORT = 38;
const HOLD_MS = 2000;   // every name stays exactly two seconds
const MAX_LIVE = 3;
const LABEL_W = 150;    // how much room a call-out takes across
const SAME_SIDE_GAP = LABEL_W + 30; // side by side on the same side of the belt
const CROSS_GAP = 40;               // one above, one below — they can sit closer

/* The hexes never change once laid out, so they render in their own
   memoised layer — call-outs coming and going can't make them re-render,
   which is what made dragging feel sticky. */
const Cells = memo(function Cells({
  cells, size, h,
}: {
  cells: Placed[];
  size: number;
  h: number;
}) {
  return (
    <>
      {cells.map((c) =>
        c.decor ? (
          <div
            key={c.key}
            className="absolute z-10"
            style={{ left: c.x, top: c.y, width: size, height: h }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 100 115.47"
              width={size}
              height={h}
              className="drop-shadow-[0_4px_10px_rgba(232,157,0,0.12)]"
            >
              <path
                d={HEX_D}
                fill="#FFF3CF"
                stroke="#FFB800"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center">
              <Bee size={Math.round(size * 0.46)} />
            </span>
          </div>
        ) : (
          <Link
            key={c.key}
            href={`/kerko?kategoria=${c.cat!.slug}`}
            aria-label={`${c.cat!.name} — shiko profesionistët`}
            draggable={false}
            className="absolute z-10"
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
        )
      )}
    </>
  );
});

export default function MobileHexBelt({
  cats,
  size = 52,
  speed = 24,
}: {
  cats: Cat[];
  size?: number;
  speed?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const dragMoved = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const [live, setLive] = useState<Callout[]>([]);

  /* A phone on its side has little height: fewer rows, smaller cells. */
  const [short, setShort] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-height: 560px)");
    const apply = () => setShort(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const ROWS = short ? ROWS_SHORT : ROWS_TALL;
  const topRoom = short ? TOP_ROOM_SHORT : TOP_ROOM;
  const bottomRoom = short ? BOTTOM_ROOM_SHORT : BOTTOM_ROOM;
  const cell = short ? Math.round(size * 0.86) : size;

  const h = cell * RATIO;
  const dx = cell;
  const dy = h * 0.75;

  const { cells, groupWidth, beltHeight } = useMemo(() => {
    /* Bees dotted around the sheet — irregular, never two touching. */
    const isDecorBee = (col: number, row: number) => {
      const hash = (col * 73856093) ^ (row * 19349663);
      const a = Math.abs(hash % 97) / 97;
      if (a > 0.13) return false;
      // keep them apart: no bee directly beside another
      const prevHash = ((col - 1) * 73856093) ^ (row * 19349663);
      if (Math.abs(prevHash % 97) / 97 <= 0.13) return false;
      return true;
    };

    /* Grow the sheet until every category fits once alongside the bees,
       so nothing has to repeat. */
    let columns = Math.max(8, Math.ceil((cats.length + 1) / ROWS));
    const slotsFor = (cols: number) => {
      let bees = 0;
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < ROWS; row++) if (isDecorBee(col, row)) bees++;
      }
      return cols * ROWS - bees;
    };
    while (slotsFor(columns) < cats.length && columns < cats.length + 8) columns++;

    const list: Placed[] = [];
    let n = 0;
    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < ROWS; row++) {
        const x = col * dx + (row % 2 === 1 ? dx / 2 : 0);
        const y = row * dy;
        const honey = (col * 2 + row) % 3 === 0;

        if (isDecorBee(col, row)) {
          list.push({ key: `d-${col}-${row}`, cat: null, decor: true, x, y, row, honey });
        } else {
          list.push({ key: `c-${col}-${row}`, cat: cats[n++ % cats.length], x, y, row, honey });
        }
      }
    }
    return {
      cells: list,
      groupWidth: columns * dx,
      beltHeight: (ROWS - 1) * dy + h,
    };
  }, [cats, dx, dy, h, ROWS]);

  const wrap = (v: number) => {
    let x = v;
    while (x <= -groupWidth) x += groupWidth;
    while (x > 0) x -= groupWidth;
    return x;
  };

  /* ---- drift, with momentum carried over from a drag ---- */
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
        if (Math.abs(velocity.current) > 6) {
          offset.current += velocity.current * dt;
          velocity.current *= Math.pow(0.02, dt); // glide to a stop
        } else {
          velocity.current = 0;
          offset.current -= rate * dt;
        }
        offset.current = wrap(offset.current);
        track.style.transform = `translate3d(${offset.current}px,0,0)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupWidth, speed]);

  /* ---- names popping up all over, without ever going quiet ---- */
  useEffect(() => {
    const named = cells.filter((c) => c.cat !== null);
    if (named.length === 0) return;

    let id = 0;
    let recent: string[] = [];                    // short memory of names just used
    let showing: { name: string; x: number; dir: "up" | "down" }[] = [];
    const RECENT = Math.min(5, Math.max(2, Math.floor(cats.length / 6)));

    const clearOf = (x: number, dir: "up" | "down", slack: number) =>
      showing.every((s) =>
        Math.abs(s.x - x) >= (s.dir === dir ? SAME_SIDE_GAP : CROSS_GAP) * slack
      );

    /* Try the strictest rule first, then loosen — so there is always
       something eligible somewhere on screen. */
    const candidates = (relax: 0 | 1 | 2 | 3) => {
      const viewW = frameRef.current?.clientWidth ?? 360;
      const left = -offset.current;
      return named.filter((c) => {
        const dir: "up" | "down" = c.row < ROWS / 2 ? "up" : "down";
        const onScreen = c.x > left + 8 && c.x < left + viewW - LABEL_W - 10;
        if (!onScreen) return false;
        if (showing.some((s) => s.name === c.cat!.name)) return false;
        if (relax === 0) return !recent.includes(c.cat!.name) && clearOf(c.x, dir, 1);
        if (relax === 1) return clearOf(c.x, dir, 1);
        if (relax === 2) return clearOf(c.x, dir, 0.6);
        return true;
      });
    };

    const spawn = () => {
      if (showing.length >= MAX_LIVE) return;

      let pool: typeof named = [];
      for (const relax of [0, 1, 2, 3] as const) {
        pool = candidates(relax);
        if (pool.length > 0) break;
      }
      if (pool.length === 0) return;

      const c = pool[Math.floor(Math.random() * pool.length)];
      const name = c.cat!.name;
      const dir: "up" | "down" = c.row < ROWS / 2 ? "up" : "down";
      recent = [...recent, name].slice(-RECENT);
      showing = [...showing, { name, x: c.x, dir }];
      const mine = ++id;

      setLive((v) => [...v, { id: mine, name, x: c.x, y: c.y, dir }]);

      window.setTimeout(() => {
        showing = showing.filter((s) => s.name !== name);
        setLive((v) => v.filter((co) => co.id !== mine));
      }, HOLD_MS);
    };

    /* A quick heartbeat: always top back up to two, and reach for a third
       now and then, so the belt is never silent. */
    const beat = () => {
      if (showing.length < 2) spawn();
      else if (Math.random() < 0.55) spawn();
    };

    const first = window.setTimeout(spawn, 300);
    const second = window.setTimeout(spawn, 800);
    const loop = window.setInterval(beat, 420);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearInterval(loop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells]);

  /* ---- drag ---- */
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragMoved.current = 0;
    velocity.current = 0;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const track = trackRef.current;
    if (track === null) return;

    const now = performance.now();
    const d = e.clientX - lastX.current;
    const dt = Math.max(8, now - lastT.current) / 1000;
    lastX.current = e.clientX;
    lastT.current = now;
    dragMoved.current += Math.abs(d);

    velocity.current = d / dt; // px per second, for the throw
    offset.current = wrap(offset.current + d);
    track.style.transform = `translate3d(${offset.current}px,0,0)`;
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    velocity.current = Math.max(-2200, Math.min(2200, velocity.current));
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (dragMoved.current > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
    dragMoved.current = 0;
  };

  const renderCallout = (co: Callout) => {
    const up = co.dir === "up";
    return (
      <div
        key={co.id}
        className="pointer-events-none absolute z-30"
        style={{
          left: co.x + cell / 2,
          top: up ? co.y - 60 : co.y + h - 10,
          width: 150,
          height: 68,
          animation: "callout-in 240ms ease-out both",
        }}
      >
        <svg
          width="150"
          height="68"
          viewBox="0 0 150 68"
          className="absolute inset-0"
          style={{ animation: "callout-glow 1.6s ease-in-out infinite" }}
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
            d={up ? "M6 62 L34 28 L144 28" : "M6 6 L34 40 L144 40"}
            fill="none"
            stroke={`url(#shine-${up ? "u" : "d"})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="150"
            style={{ animation: "callout-draw 480ms ease-out both" }}
          />
          <circle cx="6" cy={up ? 62 : 6} r="5" fill="#FFFFFF" stroke="#FFB800" strokeWidth="2" />
        </svg>

        {/* the name, lifted off the line so it reads clearly */}
        <span
          className="absolute whitespace-nowrap rounded-lg border border-gold/60 bg-white px-2 py-0.5 text-[13px] font-extrabold tracking-tight text-ink shadow-[0_3px_10px_rgba(232,157,0,0.28)]"
          style={{ left: 34, top: up ? 28 - 25 : 40 - 25 }}
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
        height: beltHeight + topRoom + bottomRoom,
        marginInline: "-1rem",
        touchAction: "pan-y",
        cursor: "grab",
        /* the hexes dissolve into the background at both edges instead of
           being cut off by the screen */
        maskImage:
          "linear-gradient(to right, transparent 0, rgba(0,0,0,0.35) 4%, #000 16%, #000 84%, rgba(0,0,0,0.35) 96%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, rgba(0,0,0,0.35) 4%, #000 16%, #000 84%, rgba(0,0,0,0.35) 96%, transparent 100%)",
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
        @keyframes callout-draw { from { stroke-dashoffset: 150 } to { stroke-dashoffset: 0 } }
        @keyframes callout-glow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(255,184,0,0.8)) }
          50%      { filter: drop-shadow(0 0 8px rgba(255,184,0,1)) }
        }
      `}</style>

      <div
        ref={trackRef}
        className="absolute left-0 will-change-transform"
        style={{ top: topRoom, width: groupWidth * 2, height: beltHeight }}
      >
        <Cells cells={cells} size={cell} h={h} />
        <div className="absolute left-0 top-0" style={{ transform: `translateX(${groupWidth}px)` }}>
          <Cells cells={cells} size={cell} h={h} />
        </div>

        {live.map(renderCallout)}
      </div>
    </div>
  );
}
