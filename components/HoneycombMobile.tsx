import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import { categories } from "@/lib/data";
import { DEFAULT_SERVICES } from "@/lib/honeycomb-slots";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

/* Phone version of the comb. The categories are scattered across the
   whole sheet in a staggered pattern — each one framed by empty hexes
   rather than packed shoulder to shoulder. */

const ROWS = 9;
const COLS = 6;

const bandCentre = (row: number) => 4.4 - 0.45 * row;

export default function HoneycombMobile({
  size = 52,
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

  type Cell = {
    key: string; col: number; row: number; c: number;
    dist: number; honey: boolean; fade: number; spread: boolean;
  };

  const cells: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    const offset = row % 2 === 1 ? 0.5 : 0;
    for (let c = 0; c < COLS; c++) {
      const col = c + offset;
      const dist = Math.abs(col - bandCentre(row));
      cells.push({
        key: `${col},${row}`,
        col,
        row,
        c,
        dist,
        honey: (c * 2 + row) % 3 === 0,
        fade: Math.max(0.2, Math.min(1, 1 - dist * 0.16)),
        /* staggered scatter: every other cell, shifting each row, so no
           two icons ever sit side by side */
        spread: (c + row) % 2 === 0,
      });
    }
  }

  const chosen = Object.values(services ?? DEFAULT_SERVICES);
  const fromCatalog = catalog?.map((c) => c.slug) ?? categories.map((c) => c.slug);
  const unique = Array.from(new Set([...chosen, ...fromCatalog]));

  /* Scattered cells become buttons; the far fringe stays empty so the
     sheet still dissolves at the edges. */
  const solid = cells
    .filter((c) => c.spread && c.dist <= 3.4)
    .sort((a, b) => (b.row - a.row) || (a.col - b.col)); // bottom-left → top-right

  const middleRow = Math.floor(ROWS / 2);
  const beeCell =
    solid.filter((c) => c.row === middleRow).sort((a, b) => a.dist - b.dist)[0] ??
    solid[Math.floor(solid.length / 2)];
  const beeKey = beeCell?.key ?? "";

  const slugFor = new Map<string, string>();
  let i = 0;
  for (const c of solid) {
    if (c.key === beeKey) continue;
    slugFor.set(c.key, unique[i % unique.length]);
    i++;
  }

  const lookup = (slug: string) =>
    catalog?.find((c) => c.slug === slug) ?? categories.find((c) => c.slug === slug);

  const allCols = cells.map((c) => c.col);
  const minCol = Math.min(...allCols);
  const width = (Math.max(...allCols) - minCol) * dx + size;
  const height = (ROWS - 1) * dy + h;

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width, height, maxWidth: "100%" }}
      aria-label="Kategoritë e shërbimeve"
    >
      {cells.map((c) => {
        const left = (c.col - minCol) * dx;
        const top = c.row * dy;

        if (c.key === beeKey) {
          return (
            <div key={c.key} className="absolute z-10" style={{ left, top, width: size, height: h }}>
              <BeeCell size={size} height={h} />
            </div>
          );
        }

        const slug = slugFor.get(c.key);
        const category = slug ? lookup(slug) : undefined;

        if (!category) {
          return (
            <div
              key={c.key}
              className="absolute"
              style={{ left, top, width: size, height: h, opacity: c.fade }}
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
            key={c.key}
            href={`/kerko?kategoria=${category.slug}`}
            aria-label={`${category.name} — shiko profesionistët`}
            draggable={false}
            className="absolute z-10 active:scale-95"
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
                fill={c.honey ? "#FFF3CF" : "#FFFFFF"}
                stroke="#FFB800"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-gold-dark">
              <CategoryIcon name={category.icon} size={21} strokeWidth={1.8} className="text-gold-dark" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
