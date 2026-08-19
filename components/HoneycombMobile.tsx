import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import CombBee, { type Stop } from "./CombBee";
import { categories } from "@/lib/data";
import { DEFAULT_SERVICES } from "@/lib/honeycomb-slots";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

/* Phone comb: a 7 x 7 sheet with categories spread across every row,
   scattered empty hexes between them, and a bee touring the icons. */

const ROWS = 7;
const COLS = 7;

const bandCentre = (row: number) => 4.6 - 0.5 * row;

export default function HoneycombMobile({
  size = 50,
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
    dist: number; honey: boolean; fade: number; gap: boolean;
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
        fade: Math.max(0.2, Math.min(1, 1 - dist * 0.15)),
        /* breathing holes land on every row, never side by side */
        gap: (c * 3 + row * 2) % 5 === 0,
      });
    }
  }

  const chosen = Object.values(services ?? DEFAULT_SERVICES);
  const fromCatalog = catalog?.map((c) => c.slug) ?? categories.map((c) => c.slug);
  const unique = Array.from(new Set([...chosen, ...fromCatalog]));

  /* every row keeps icons — only the outermost fringe stays empty */
  const solid = cells
    .filter((c) => !c.gap && c.dist <= 4.6)
    .sort((a, b) => (b.row - a.row) || (a.col - b.col));

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

  /* where the touring bee should stop, in the comb's own coordinates */
  const stops: Stop[] = solid
    .filter((c) => c.key !== beeKey)
    .map((c) => {
      const slug = slugFor.get(c.key);
      const cat = slug ? lookup(slug) : undefined;
      return cat
        ? { x: (c.col - minCol) * dx, y: c.row * dy, name: cat.name }
        : null;
    })
    .filter((s): s is Stop => s !== null)
    /* wander rather than march: visit every third stop, looping around */
    .filter((_, idx, arr) => idx < arr.length)
    .map((s, idx, arr) => arr[(idx * 5) % arr.length]);

  return (
    <div
      className="relative -mx-2 select-none"
      style={{ width, height, maxWidth: "100%", marginInline: "auto" }}
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
              <CategoryIcon name={category.icon} size={20} strokeWidth={1.8} className="text-gold-dark" />
            </span>
          </Link>
        );
      })}

      <CombBee stops={stops} size={size} />
    </div>
  );
}
