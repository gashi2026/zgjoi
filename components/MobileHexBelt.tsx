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

type Callout = { id: number; name: string; icon: string; x: number; y: number; dir: "up" | "down" };

const ROWS_TALL = 4;
const ROWS_SHORT = 3;   // phone held sideways — less height to play with
const TOP_ROOM = 66;
const BOTTOM_ROOM = 54;
const TOP_ROOM_SHORT = 46;
const BOTTOM_ROOM_SHORT = 38;
const HOLD_MS = 2600;   // a slow swell, a pause on the name, a slow settle
const MAX_LIVE = 4;
const LABEL_W = 96;          // a grown cell plus its name
const GAP_SAME_ROW = 168;    // two swollen cells on one row
const GAP_ANY = 96;          // neighbouring rows sit lower, so they need less

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

  useEffect(() => {
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

      const fade = p < 0.12 ? p / 0.12 : p > 0.94 ? (1 - p) / 0.06 : 1;

      el.style.transform = `scale(${k})`;
      el.style.opacity = String(Math.max(0, Math.min(1, fade)));
      if (label) {
        const lf = p < 0.3 ? 0 : p > 0.78 ? 0 : 1;
        label.style.opacity = String(lf);
      }

      if (p < 1) raf = requestAnimationFrame(tick);
    };

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
        transform: "scale(1.25)",
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
        <CategoryIcon name={co.icon} size={21} strokeWidth={1.9} className="text-gold-dark" />
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
    let recent: string[] = [];
    let showing: { name: string; x: number; row: number }[] = [];
    const RECENT = Math.min(5, Math.max(2, Math.floor(cats.length / 6)));

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

    const candidates = (row: number, relax: 0 | 1 | 2) => {
      const viewW = viewWidth();
      const left = -offset.current;
      return named.filter((c) => {
        if (c.row !== row) return false;
        if (showing.some((s) => s.row === c.row)) return false;
        if (showing.some((s) => s.name === c.cat!.name)) return false;
        /* skip cells drifting off the left and those still entering on
           the right — a cell should have time to swell and settle while
           it is comfortably in view */
        if (c.x <= left + viewW * 0.14) return false;
        if (c.x >= left + viewW - LABEL_W - viewW * 0.06) return false;
        if (relax === 0) return !recent.includes(c.cat!.name) && roomFor(c.x, row, 1);
        return roomFor(c.x, row, 1); // spacing is never relaxed — no overlaps
      });
    };

    const spawn = () => {
      if (showing.length >= MAX_LIVE) return;

      /* walk the row order until one of them has somewhere to pop */
      for (let attempt = 0; attempt < order.length; attempt++) {
        const row = order[(turn + attempt) % order.length];
        let pool: typeof named = [];
        for (const relax of [0, 1, 2] as const) {
          pool = candidates(row, relax);
          if (pool.length > 0) break;
        }
        if (pool.length === 0) continue;

        /* aim around the middle, biased a touch to the right, where a
           cell still has plenty of screen time ahead of it */
        const vw = viewWidth();
        const aim = -offset.current + vw * 0.58;
        const ranked = [...pool].sort(
          (a, b) => Math.abs(a.x - aim) - Math.abs(b.x - aim)
        );
        const reach = Math.max(1, Math.ceil(ranked.length * 0.75));
        const c = ranked[Math.floor(Math.random() * reach)];
        const name = c.cat!.name;
        recent = [...recent, name].slice(-RECENT);
        showing = [...showing, { name, x: c.x, row: c.row }];
        turn = (turn + attempt + 1) % order.length;
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
        return;
      }
    };

    const beat = () => {
      if (showing.length < MAX_LIVE) spawn();
    };

    const t1 = window.setTimeout(spawn, 200);
    const t2 = window.setTimeout(spawn, 750);
    const t3 = window.setTimeout(spawn, 1300);
    const loop = window.setInterval(beat, 340);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
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
