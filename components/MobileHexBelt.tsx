"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import { HEX_D, HEX_RATIO } from "@/lib/hex";

type Category = { slug: string; name: string; icon: string };
const SIZE = 64;
const STEP = 70;
const HEIGHT = SIZE * HEX_RATIO;

/** Native scrolling keeps each category reachable once, without moving targets,
 * duplicated tab stops or animation work when the belt is off screen. */
export default function MobileHexBelt({ cats }: { cats: Category[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const id = useId();
  if (!cats.length) return null;
  const rows = Math.min(4, cats.length);
  const columns = Math.ceil(cats.length / rows);
  const scroll = (direction: number) => viewport.current?.scrollBy({
    left: direction * Math.max(STEP * 3, viewport.current.clientWidth * 0.75),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });

  return (
    <div className="min-w-0" aria-label="Shërbimet">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">Zgjidh shërbimin · rrëshqit për më shumë</p>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => scroll(-1)} aria-label="Shërbimet e mëparshme" aria-controls={id} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-gold"><ArrowLeft size={18} /></button>
          <button type="button" onClick={() => scroll(1)} aria-label="Shërbimet e tjera" aria-controls={id} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-gold"><ArrowRight size={18} /></button>
        </div>
      </div>
      <div id={id} ref={viewport} className="hive-scroll overflow-x-auto overscroll-x-contain pb-3 pt-10" data-mobile-hive>
        <div className="relative" style={{ width: columns * STEP + STEP / 2, height: (rows - 1) * (HEIGHT * 0.75 + 4) + HEIGHT + 12 }}>
          {cats.map((category, index) => {
            const row = index % rows;
            const column = Math.floor(index / rows);
            return (
              <Link key={category.slug} href={`/kerko?kategoria=${encodeURIComponent(category.slug)}`} aria-label={`${category.name} — shiko profesionistët`}
                className="group absolute rounded-xl hover:z-10 focus:z-10" data-hive-cell
                style={{ width: SIZE, height: HEIGHT, left: column * STEP + (row % 2 ? STEP / 2 : 0), top: row * (HEIGHT * 0.75 + 4) }}>
                <svg viewBox="0 0 100 115.47" width="100%" height="100%" aria-hidden="true">
                  <path d={HEX_D} fill={(row + column) % 3 ? "#FFFFFF" : "#FFF3CF"} stroke="#FFB800" strokeWidth={2.5} strokeLinejoin="round" className="transition-colors group-hover:fill-[#FFE9A8] group-focus-visible:fill-[#FFE9A8]" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-gold-dark"><CategoryIcon name={category.icon} size={28} /></span>
                <span className={`pointer-events-none absolute bottom-full z-20 w-max max-w-36 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 ${column === 0 ? "left-0" : column === columns - 1 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                  <span className="block rounded-xl border border-gold bg-white px-3 py-1 text-center text-xs font-semibold text-ink shadow-soft">{category.name}</span>
                  <span className="mx-auto block h-2 w-px bg-gold" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
