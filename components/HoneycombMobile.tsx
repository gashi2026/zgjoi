import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import { categories } from "@/lib/data";
import { DEFAULT_SERVICES } from "@/lib/honeycomb-slots";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

/* Phone version of the comb: same construction as the desktop one —
   whole/half-step rows, a diagonal band of services climbing from the
   bottom left to the top right, and filler cells fading out toward the
   fringes — but sized to fill the width of a phone screen. */

const ROWS = 9;
const COLS = 6;

/* Centre of the band on each row. Row 0 is the top, so the band starts
   right and walks left as it goes down. */
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

  type Cell = { col: number; row: number; dist: number; honey: boolean; fade: number };
  const cells: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    const offset = row % 2 === 1 ? 0.5 : 0;
    for (let c = 0; c < COLS; c++) {
      const col = c + offset;
      const dist = Math.abs(col - bandCentre(row));
      cells.push({
        col,
        row,
        dist,
        honey: (c * 2 + row) % 3 === 0,
        fade: Math.max(0.22, Math.min(1, 1 - dist * 0.19)),
      });
    }
  }

  /* Cells close to the band carry a service; the rest are faint filler. */
  const solid = cells
    .filter((c) => c.dist <= 1.05)
    .sort((a, b) => (b.row - a.row) || (a.col - b.col)); // bottom-left → top-right

  const chosen = Object.values(services ?? DEFAULT_SERVICES);
  const unique = Array.from(new Set(chosen));

  // the bee takes the most central cell of the middle row
  const middleRow = Math.floor(ROWS / 2);
  const beeCell =
    solid.filter((c) => c.row === middleRow).sort((a, b) => a.dist - b.dist)[0] ??
    solid[Math.floor(solid.length / 2)];
  const beeKey = beeCell ? `${beeCell.col},${beeCell.row}` : "";

  const slugFor = new Map<string, string>();
  let i = 0;
  for (const c of solid) {
    const key = `${c.col},${c.row}`;
    if (key === beeKey) continue;
    slugFor.set(key, unique[i % unique.length]);
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
        const key = `${c.col},${c.row}`;
        const left = (c.col - minCol) * dx;
        const top = c.row * dy;

        if (key === beeKey) {
          return (
            <div key={key} className="absolute z-10" style={{ left, top, width: size, height: h }}>
              <BeeCell size={size} height={h} />
            </div>
          );
        }

        const slug = slugFor.get(key);
        const category = slug ? lookup(slug) : undefined;

        /* faint filler, thinning out toward the edges */
        if (!category) {
          return (
            <div
              key={key}
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
            key={key}
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
