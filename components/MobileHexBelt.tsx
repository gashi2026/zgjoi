"use client";

import Link from "next/link";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import BeltIcon from "./BeltIcons";
import { Bee } from "./Brand";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

type Cat = { slug: string; name: string; icon: string };

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
