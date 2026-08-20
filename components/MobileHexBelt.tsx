"use client";

import Link from "next/link";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import { Bee } from "./Brand";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

type Cat = { slug: string; name: string; icon: string };

/* A couple of icons the shared set doesn't carry. */
function Dog({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 5.5 8.5 3 6 4v3.5" />
      <path d="M14 5.5 15.5 3 18 4v3.5" />
      <path d="M6 7.5c0 3 1 4.5 1 6.5v4a1.5 1.5 0 0 0 3 0v-2h4v2a1.5 1.5 0 0 0 3 0v-4c0-2 1-3.5 1-6.5" />
      <path d="M9.5 11h.01M14.5 11h.01" />
      <path d="M12 13.5c-.8 0-1.2.6-1.2 1.1 0 .6.5 1 1.2 1s1.2-.4 1.2-1c0-.5-.4-1.1-1.2-1.1Z" />
    </svg>
  );
}

function Ballerina({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 100 130" fill="currentColor" aria-hidden="true">
      <ellipse cx="53" cy="6" rx="6" ry="5" />
      <circle cx="50" cy="16" r="9" />
      <path d="M47 24 L53 24 L52 31 L48 31 Z" />
      <path d="M44 30 C42 38 41 46 42 52 L58 52 C59 46 58 38 56 30 C53 32 47 32 44 30 Z" />
      <path d="M44 33 C34 36 22 42 8 52 C6.5 53 7 55.5 9 55 C23 50 35 44 45 40 Z" />
      <path d="M56 33 C66 36 78 42 92 52 C93.5 53 93 55.5 91 55 C77 50 65 44 55 40 Z" />
      <path d="M42 51 C28 54 18 60 14 66 C24 71 38 73 50 73 C62 73 76 71 86 66 C82 60 72 54 58 51 Z" />
      <path d="M46 72 C45 88 44 102 43 114 L48 114 C49 102 49.5 88 50 73 Z" />
      <path d="M54 72 C55 86 55 98 52 108 C51 113 49 118 47 122 L52 123 C55 117 57 110 58 102 C59 92 59 82 58 73 Z" />
      <path d="M43 114 L41 123 C41 125 43 126 44 124 L48 115 Z" />
      <path d="M47 122 L45 128 C45 130 47 130.5 48 129 L52 123 Z" />
    </svg>
  );
}

function Medical({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />
    </svg>
  );
}

function Towing({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17h1.2M9 17h6" />
      <circle cx="6.5" cy="17" r="1.8" />
      <circle cx="17.5" cy="17" r="1.8" />
      <path d="M2 17v-4h9l2.5-3H17l4 4v3" />
      <path d="M11 10 15 4h4" />
    </svg>
  );
}


function Alarm({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 8-2.5 8h17S18 15 18 9Z" />
      <path d="M10.3 20.5a2 2 0 0 0 3.4 0" />
      <path d="M3.5 5.5 6 3.2M20.5 5.5 18 3.2" />
    </svg>
  );
}

function Architect({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="4.6" r="1.8" />
      <path d="M11 6.2 5.5 20M13 6.2 18.5 20" />
      <path d="M8.6 13.5h6.8" />
      <path d="M4 20h4M16 20h4" />
    </svg>
  );
}

function Chef({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 13.8A3.7 3.7 0 0 1 8 6.7a4.2 4.2 0 0 1 8 0 3.7 3.7 0 0 1 1.5 7.1" />
      <path d="M6.5 13.8V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-5.2" />
      <path d="M6.7 16.6h10.6" />
    </svg>
  );
}

function Vet({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7" cy="8" r="1.7" />
      <circle cx="11.4" cy="6.2" r="1.7" />
      <circle cx="16" cy="8" r="1.7" />
      <path d="M11.5 11c-2.4 0-4.3 1.9-4.3 3.9 0 1.7 1.4 2.8 3 2.8h2.6c1.6 0 3-1.1 3-2.8 0-2-1.9-3.9-4.3-3.9Z" />
      <path d="M18.6 15.4v3.4M16.9 17.1h3.4" />
    </svg>
  );
}

function Welder({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.4 3.6 20 9.2" />
      <path d="M13 5 4.6 13.4a2 2 0 0 0 0 2.9l1.1 1.1a2 2 0 0 0 2.9 0L17 9" />
      <path d="M3.4 20.6h5.2" />
      <path d="M19 12.4v2.2M21.4 13.5h-2.2M20.6 16.6l-1.6-1.6" />
    </svg>
  );
}

function Nails({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.4 3.4h3.2v3.2H9.4z" />
      <path d="M8 6.6h6v13a1.4 1.4 0 0 1-1.4 1.4H9.4A1.4 1.4 0 0 1 8 19.6Z" />
      <path d="M8 11.4h6" />
      <path d="M17.6 8.2c0 1.2 1.4 2.4 1.4 3.6a1.4 1.4 0 0 1-2.8 0c0-1.2 1.4-2.4 1.4-3.6Z" />
    </svg>
  );
}


function Dancer({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.6" cy="4.2" r="1.9" />
      <path d="M13.2 7.2 10.6 12l3.4 2.2-1.2 6.4" />
      <path d="M13.2 7.2 17.6 9.6 20 8.2" />
      <path d="M10.6 12 6.4 11.2 4.4 13.4" />
      <path d="M14 14.2 9.6 20.4" />
    </svg>
  );
}

function Carpenter({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.4 15.6 12 7l2.6 2.6-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6Z" />
      <path d="M11 8 14.4 4.6a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L16 13" />
      <path d="M14.6 6.2 17.8 9.4" />
      <path d="M3.4 20.6h8" />
    </svg>
  );
}

/* Draw whichever icon the category asks for. */
function BeltIcon({ name, size = 21 }: { name: string; size?: number }) {
  if (name === "dog") return <Dog size={size} />;
  if (name === "ballerina") return <Ballerina size={Math.round(size * 0.9)} />;
  if (name === "medical") return <Medical size={size} />;
  if (name === "towing") return <Towing size={size} />;
  if (name === "alarm") return <Alarm size={size} />;
  if (name === "architect") return <Architect size={size} />;
  if (name === "chef") return <Chef size={size} />;
  if (name === "vet") return <Vet size={size} />;
  if (name === "welder") return <Welder size={size} />;
  if (name === "nails") return <Nails size={size} />;
  if (name === "dancer") return <Dancer size={size} />;
  if (name === "carpenter") return <Carpenter size={size} />;
  return <CategoryIcon name={name} size={size} strokeWidth={1.8} className="text-gold-dark" />;
}



type Placed = {
  key: string;
  cat: Cat | null;  // null = a bee cell
  decor?: boolean;  // bees, purely decorative
  x: number;
  y: number;
  row: number;
  honey: boolean;
};

type Callout = { id: number; name: string; icon: string; x: number; y: number; dir: "up" | "down" };

const ROWS_TALL = 4;
const ROWS_SHORT = 3;   // phone held sideways — less height to play with
const TOP_ROOM = 66;
const BOTTOM_ROOM = 54;
const TOP_ROOM_SHORT = 46;
const BOTTOM_ROOM_SHORT = 38;
const HOLD_MS = 2400;   // a slow swell, a pause on the name, a slow settle
const MAX_LIVE = 4;
const LABEL_W = 96;          // a grown cell plus its name
const GAP_SAME_ROW = 132;    // two swollen cells on one row (~80px each)
const GAP_ANY = 76;          // different rows are offset vertically too

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
              <BeltIcon name={c.cat!.icon} size={21} />
            </span>
          </Link>
        )
      )}
    </>
  );
});


/* One swelling cell. It animates itself frame by frame, so it does not
   depend on any stylesheet being present, and it starts already visible
   at full size in case the animation cannot run at all. */
function GrowCell({
  co, cell, h, duration,
}: {
  co: Callout;
  cell: number;
  h: number;
  duration: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const label = nameRef.current;
    if (el === null) return;

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const PEAK = 1.55;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);

      let k: number;
      if (p < 0.34) k = 1 + (PEAK - 1) * ease(p / 0.34);           // slow swell
      else if (p < 0.66) k = PEAK;                                  // hold
      else k = 1 + (PEAK - 1) * (1 - ease((p - 0.66) / 0.34));      // slow settle

      const fade = p > 0.94 ? (1 - p) / 0.06 : 1;

      el.style.transform = `scale(${k})`;
      el.style.opacity = String(Math.max(0, Math.min(1, fade)));
      if (label) {
        const inP = Math.min(1, Math.max(0, (p - 0.26) / 0.14));
        const outP = Math.min(1, Math.max(0, (p - 0.74) / 0.14));
        label.style.opacity = String(inP * (1 - outP));
      }

      if (p < 1) raf = requestAnimationFrame(tick);
    };

    tick(start);                       // set frame zero before first paint
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-30"
      style={{
        left: co.x,
        top: co.y,
        width: cell,
        height: h,
        transformOrigin: "center center",
        transform: "scale(1)",
        opacity: 1,
        backfaceVisibility: "hidden",
        willChange: "transform, opacity",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 115.47"
        width={cell}
        height={h}
        className="drop-shadow-[0_6px_16px_rgba(232,157,0,0.32)]"
      >
        <path d={HEX_D} fill="#FFE9A8" stroke="#E89D00" strokeWidth={3} strokeLinejoin="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-gold-dark">
        <BeltIcon name={co.icon} size={21} />
      </span>
      {/* the name always rides on top of the icon */}
      <span
        ref={nameRef}
        className="absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gold px-1.5 py-[1px] text-[9px] font-extrabold tracking-tight text-ink shadow-[0_2px_6px_rgba(232,157,0,0.35)]"
        style={{ marginBottom: -6, opacity: 0 }}
      >
        {co.name}
      </span>
    </div>
  );
}

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

  /* ---- which cells are swelling right now ---- */
  useEffect(() => {
    const named = cells.filter((c) => c.cat !== null);
    if (named.length === 0) return;

    /* Rows take turns in this order, so the pops travel around the belt
       instead of clustering: top, bottom, second, third. */
    const order = ROWS === 3 ? [0, 2, 1] : [0, 3, 1, 2];
    let turn = 0;

    let id = 0;
    let showing: { name: string; x: number; row: number }[] = [];
    /* Position in the run when each category last showed. A category is
       locked out until a good number of others have had their turn, so
       the belt can't ping-pong between the same couple of icons. */
    const shownAt = new Map<string, number>();
    let seq = 0;
    const COOLDOWN = Math.max(6, Math.min(16, cats.length - 4));

    const viewWidth = () => {
      const w = frameRef.current?.clientWidth ?? 0;
      return w > 40 ? w : 360;
    };

    /* no swollen cell may sit close enough to touch another */
    const roomFor = (x: number, row: number, slack: number) =>
      showing.every((s) => {
        const need = s.row === row ? GAP_SAME_ROW : GAP_ANY;
        return Math.abs(s.x - x) >= need * slack;
      });

    const candidates = (row: number, band: number, cooldown: number) => {
      const viewW = viewWidth();
      const left = -offset.current;
      /* normally we stay clear of the edges; when the middle is busy we
         reach further out rather than skipping a turn */
      const from = left + viewW * band;
      const to = left + viewW - LABEL_W - 4;

      return named.filter((c) => {
        if (c.row !== row) return false;
        if (showing.some((s) => s.row === c.row)) return false;
        if (showing.some((s) => s.name === c.cat!.name)) return false;
        if (c.x <= from || c.x >= to) return false;
        const since = seq - (shownAt.get(c.cat!.name) ?? -Infinity);
        if (since < cooldown) return false;         // still resting
        return roomFor(c.x, row, 1); // spacing is never relaxed — no overlaps
      });
    };

    const place = (c: (typeof named)[number]) => {
      const name = c.cat!.name;
      shownAt.set(name, ++seq);
      showing = [...showing, { name, x: c.x, row: c.row }];
      const mine = ++id;

      setLive((v) => [
        ...v,
        {
          id: mine,
          name,
          icon: c.cat!.icon,
          x: c.x,
          y: c.y,
          dir: c.row < ROWS / 2 ? "up" : "down",
        },
      ]);

      window.setTimeout(() => {
        showing = showing.filter((s) => s.name !== name);
        setLive((v) => v.filter((co) => co.id !== mine));
      }, HOLD_MS);
    };

    const spawn = () => {
      if (showing.length >= MAX_LIVE) return;

      /* Sweep: keep the full rest period first, widen the search area
         next, and only shorten the rest as a last resort. */
      const passes: { band: number; cooldown: number }[] = [
        { band: 0.34, cooldown: COOLDOWN },              // right of centre
        { band: 0.22, cooldown: COOLDOWN },              // reach further left
        { band: 0.12, cooldown: COOLDOWN },              // most of the width
        { band: 0.12, cooldown: Math.ceil(COOLDOWN / 2) },
        { band: 0.1, cooldown: 3 },
      ];

      for (const pass of passes) {
        for (let attempt = 0; attempt < order.length; attempt++) {
          const row = order[(turn + attempt) % order.length];
          const pool = candidates(row, pass.band, pass.cooldown);
          if (pool.length === 0) continue;

          /* longest-rested first, then whatever sits nicely on screen */
          const restedAt = (c: (typeof pool)[number]) =>
            shownAt.get(c.cat!.name) ?? -Infinity; // never shown wins
          const byRest = [...pool].sort((a, b) => restedAt(a) - restedAt(b));
          const freshest = byRest.slice(0, Math.max(1, Math.ceil(byRest.length * 0.6)));

          const vw = viewWidth();
          const aim = -offset.current + vw * 0.7;
          const ranked = freshest.sort(
            (a, b) => Math.abs(a.x - aim) - Math.abs(b.x - aim)
          );
          const reach = Math.max(1, Math.ceil(ranked.length * 0.7));
          place(ranked[Math.floor(Math.random() * reach)]);
          turn = (turn + attempt + 1) % order.length;
          return;
        }
      }
    };

    /* One pop leaves exactly as another arrives: spawning on a fixed
       cadence of lifetime ÷ count keeps a steady four on screen with no
       bursts and no quiet gaps. */
    const cadence = Math.round(HOLD_MS / MAX_LIVE);
    const kick: number[] = [];
    for (let i = 0; i < MAX_LIVE; i++) {
      kick.push(window.setTimeout(spawn, 150 + i * cadence));
    }
    const loop = window.setInterval(spawn, cadence);

    return () => {
      kick.forEach((t) => window.clearTimeout(t));
      window.clearInterval(loop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, ROWS]);

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
      <div
        ref={trackRef}
        className="absolute left-0 will-change-transform"
        style={{ top: topRoom, width: groupWidth * 2, height: beltHeight }}
      >
        <Cells cells={cells} size={cell} h={h} />
        <div className="absolute left-0 top-0" style={{ transform: `translateX(${groupWidth}px)` }}>
          <Cells cells={cells} size={cell} h={h} />
        </div>

        {live.map((co) => (
          <GrowCell key={co.id} co={co} cell={cell} h={h} duration={HOLD_MS} />
        ))}
        {live.map((co) => (
          <GrowCell
            key={`${co.id}-loop`}
            co={{ ...co, x: co.x + groupWidth }}
            cell={cell}
            h={h}
            duration={HOLD_MS}
          />
        ))}
      </div>
    </div>
  );
}
