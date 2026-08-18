import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import { categories } from "@/lib/data";
import { DEFAULT_SERVICES } from "@/lib/honeycomb-slots";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

/* A narrow, tall comb for phones: same look as the desktop one, but
   stacked into a vertical band that fits between the search box and
   the stats row. */

const GRID: { row: number; cols: number[] }[] = [
  { row: 0, cols: [1.5, 2.5] },
  { row: 1, cols: [1, 2, 3] },
  { row: 2, cols: [0.5, 1.5, 2.5] },
  { row: 3, cols: [0, 1, 2] },
  { row: 4, cols: [0.5, 1.5, 2.5] },
  { row: 5, cols: [1, 2, 3] },
  { row: 6, cols: [1.5, 2.5] },
];

/* Cells that carry a service, ordered bottom-left → top-right. */
const SLOTS = [
  "1,5", "3,5", "2.5,6",
  "0.5,4", "2.5,4",
  "0,3", "2,3",
  "0.5,2", "2.5,2",
  "1,1", "2,1", "2.5,0",
];

const BEE_AT = "1,3";

export default function HoneycombMobile({
  size = 56,
  services,
  catalog,
}: {
  size?: number;
  services?: Record<string, string>;
  catalog?: { slug: string; name: string; icon: string }[];
}) {
  const h = size * RATIO;
  const dx = size;
  const dy = h * 0.75;

  // the admin's chosen categories, in the same order as the desktop comb
  const chosen = Object.values(services ?? DEFAULT_SERVICES);
  const unique = Array.from(new Set(chosen));
  const slugFor = new Map(SLOTS.map((cell, i) => [cell, unique[i % unique.length]]));

  const lookup = (slug: string) =>
    catalog?.find((c) => c.slug === slug) ?? categories.find((c) => c.slug === slug);

  const allCols = GRID.flatMap((r) => r.cols);
  const minCol = Math.min(...allCols);
  const width = (Math.max(...allCols) - minCol) * dx + size;
  const height = Math.max(...GRID.map((r) => r.row)) * dy + h;

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width, height }}
      aria-label="Kategoritë e shërbimeve"
    >
      {GRID.flatMap(({ row, cols }) =>
        cols.map((col) => {
          const key = `${col},${row}`;
          const left = (col - minCol) * dx;
          const top = row * dy;
          const honey = (col * 2 + row) % 3 === 0;

          if (key === BEE_AT) {
            return (
              <div key={key} className="absolute" style={{ left, top, width: size, height: h }}>
                <BeeCell size={size} height={h} />
              </div>
            );
          }

          const slug = slugFor.get(key);
          const category = slug ? lookup(slug) : undefined;

          /* faint filler */
          if (!category) {
            return (
              <div key={key} className="absolute" style={{ left, top, width: size, height: h }} aria-hidden="true">
                <svg viewBox="0 0 100 115.47" width={size} height={h}>
                  <path d={HEX_D} fill={honey ? "#FFFAEC" : "transparent"} stroke="#F2E9D4" strokeWidth={2} strokeLinejoin="round" />
                </svg>
              </div>
            );
          }

          return (
            <Link
              key={key}
              href={`/kerko?kategoria=${category.slug}`}
              aria-label={`${category.name} — shiko profesionistët`}
              draggable={false}
              className="absolute active:scale-95"
              style={{ left, top, width: size, height: h }}
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
                  fill={honey ? "#FFF3CF" : "#FFFFFF"}
                  stroke="#FFB800"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-gold-dark">
                <CategoryIcon name={category.icon} size={22} strokeWidth={1.8} className="text-gold-dark" />
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}
