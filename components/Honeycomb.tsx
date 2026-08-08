import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import { categories } from "@/lib/data";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

type Cell = {
  col: number; // horizontal step (odd rows are offset by half a step)
  row: number; // vertical step
  slug?: string; // links to a service category
  bee?: boolean;
  honey?: boolean; // honey fill instead of white
  below?: boolean; // show the hover label below instead of above
  fade?: number; // opacity for filler cells, 0–1
};

/* The comb climbs from beside the search bar at the lower left up to the
   top right. Even rows sit on whole steps, odd rows are offset by half a
   step so every cell locks against its neighbours. Gold cells are the
   services; the filler around them thins out toward the edges. */
const ROWS: { row: number; offset: number; cols: number[] }[] = [
  { row: 0, offset: 0.5, cols: [3, 4, 5, 6] },
  { row: 1, offset: 0, cols: [2, 3, 4, 5, 6] },
  { row: 2, offset: 0.5, cols: [2, 3, 4, 5, 6] },
  { row: 3, offset: 0, cols: [1, 2, 3, 4, 5] },
  { row: 4, offset: 0.5, cols: [-2, -1, 0, 1, 2, 3, 4, 5] },
  { row: 5, offset: 0, cols: [-3, -2, -1, 0, 1, 2, 3, 4] },
  { row: 6, offset: 0.5, cols: [-3, -2, -1, 0, 1, 2, 3] },
  { row: 7, offset: 0, cols: [-3, -2, -1, 0, 1, 2] },
];

/* Centre of the band on each row — used to fade the filler cells out
   toward the fringes so the sheet climbs rather than sitting in a block. */
const bandCentre = (row: number) => 5.2 - 0.62 * row;

/* Which cells carry a service. Key is "col,row" using the offset column. */
const SERVICES: Record<string, string> = {
  "5.5,0": "internet",
  "4,1": "siguria",
  "6,1": "klima",
  "3.5,2": "mobilje",
  "5.5,2": "riparime",
  "2,3": "transport",
  "4,3": "kopsht",
  "1.5,4": "piktor",
  "3.5,4": "pastrim",
  "2.5,4": "elektricist",
  "1,5": "hidraulik",
  "3,5": "ndertim",
};

const BEE_AT = "3,3";

const CELLS: Cell[] = ROWS.flatMap(({ row, offset, cols }) =>
  cols.map((c) => {
    const col = c + offset;
    const key = `${col},${row}`;
    const slug = SERVICES[key];
    const fade = Math.max(
      0.28,
      Math.min(1, 1 - Math.abs(col - bandCentre(row)) * 0.21)
    );
    return {
      col,
      row,
      slug,
      bee: key === BEE_AT,
      /* alternate the fill so the comb has some texture */
      honey: (c * 2 + row) % 3 === 0,
      below: row === 0,
      fade,
    };
  })
);

/* Hover label: a pill with a short gold line connecting it to the cell. */
function Label({ name, below }: { name: string; below?: boolean }) {
  const pill = (
    <span className="block whitespace-nowrap rounded-full border border-gold bg-white px-3 py-1 text-xs font-bold text-ink shadow-lift">
      {name}
    </span>
  );
  const line = <span className="mx-auto block h-3.5 w-[2px] bg-gold" />;

  return (
    <span
      className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
        below
          ? "bottom-1 translate-y-full group-hover:translate-y-[calc(100%+10px)] group-focus-visible:translate-y-[calc(100%+10px)]"
          : "top-1 -translate-y-full group-hover:-translate-y-[calc(100%+10px)] group-focus-visible:-translate-y-[calc(100%+10px)]"
      }`}
    >
      {below ? (
        <>
          {line}
          {pill}
        </>
      ) : (
        <>
          {pill}
          {line}
        </>
      )}
    </span>
  );
}

export default function Honeycomb({ size = 70 }: { size?: number }) {
  const h = size * RATIO;
  const dx = size; // horizontal distance between hex centres
  const dy = h * 0.75; // vertical distance between rows

  const cols = CELLS.map((c) => c.col);
  const minCol = Math.min(...cols);
  const width = (Math.max(...cols) - minCol) * dx + size;
  const height = Math.max(...CELLS.map((c) => c.row)) * dy + h;

  return (
    <div className="relative select-none" style={{ width, height }}>
      {CELLS.map((c, i) => {
        const left = (c.col - minCol) * dx;
        const top = c.row * dy;
        const category = c.slug
          ? categories.find((cat) => cat.slug === c.slug)
          : undefined;
        const decorative = !category && !c.bee;

        const shape = (
          <svg
            viewBox="0 0 100 115.47"
            width={size}
            height={h}
            className={
              decorative
                ? ""
                : "drop-shadow-[0_6px_14px_rgba(232,157,0,0.12)] transition-transform duration-200 group-hover:scale-[1.06]"
            }
            aria-hidden="true"
          >
            <path
              d={HEX_D}
              fill={
                decorative
                  ? c.honey
                    ? "#FFFAEC"
                    : "transparent"
                  : c.honey
                  ? "#FFF3CF"
                  : "#FFFFFF"
              }
              stroke={decorative ? "#F2E9D4" : "#FFB800"}
              strokeWidth={decorative ? 2 : 2.5}
              strokeLinejoin="round"
              className={
                decorative
                  ? ""
                  : "transition-colors duration-200 group-hover:fill-[#FFE9A8] group-hover:stroke-[#E89D00]"
              }
            />
          </svg>
        );

        /* faint decorative cell */
        if (decorative) {
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left,
                top,
                width: size,
                height: h,
                opacity: c.fade ?? 1,
              }}
              aria-hidden="true"
            >
              {shape}
            </div>
          );
        }

        /* the bee at the centre — click it to release a swarm */
        if (c.bee) {
          return (
            <div
              key={i}
              className="absolute"
              style={{ left, top, width: size, height: h }}
            >
              <BeeCell size={size} height={h} />
            </div>
          );
        }

        /* a clickable service */
        return (
          <Link
            key={i}
            href={`/kerko?kategoria=${category!.slug}`}
            aria-label={`${category!.name} — shiko profesionistët`}
            draggable={false}
            className="group absolute z-10 hover:z-40 focus:z-40"
            style={{ left, top, width: size, height: h }}
          >
            {shape}
            <span className="absolute inset-0 flex items-center justify-center text-gold-dark transition-transform duration-200 group-hover:scale-110">
              <CategoryIcon
                name={category!.icon}
                size={30}
                className="text-gold-dark"
                strokeWidth={1.7}
              />
            </span>
            <Label name={category!.name} below={c.below} />
          </Link>
        );
      })}
    </div>
  );
}
