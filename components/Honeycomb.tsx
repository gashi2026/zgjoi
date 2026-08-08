import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import { categories } from "@/lib/data";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

type Cell = {
  col: number;
  row: number;
  fill?: string;
  stroke?: string;
  icon?: React.ReactNode;
  label?: string;
  href?: string;
  faint?: boolean;
  bee?: boolean;
};

/* Grid grows bottom-left → top-right exactly as before, with new
   categories added to the outer ring and trailing faint cells. */
const CELLS: Cell[] = [
  // row 0 — top strip
  { col: 0.5, row: 0, fill: "#FFFFFF", icon: <CategoryIcon name="zap" size={34} strokeWidth={1.7} />, label: "Elektricist", href: "/kerko?kategoria=elektricist" },
  { col: 1.5, row: 0, fill: "#FFF3CF", icon: <CategoryIcon name="home" size={38} strokeWidth={1.7} />, label: "Ndërtim", href: "/kerko?kategoria=ndertim" },
  { col: 2.5, row: 0, fill: "#FFFFFF", icon: <CategoryIcon name="camera" size={32} strokeWidth={1.7} />, label: "Fotograf", href: "/kerko?kategoria=fotograf" },
  { col: 3.5, row: 0, faint: true },
  // row 1 — middle
  { col: 0, row: 1, fill: "#FFFFFF", icon: <CategoryIcon name="paintbrush" size={34} strokeWidth={1.7} />, label: "Piktor", href: "/kerko?kategoria=piktor" },
  { col: 1, row: 1, bee: true },
  { col: 2, row: 1, fill: "#FFFFFF", icon: <CategoryIcon name="droplets" size={34} strokeWidth={1.7} />, label: "Hidraulik", href: "/kerko?kategoria=hidraulik" },
  { col: 3, row: 1, fill: "#FFF3CF", icon: <CategoryIcon name="music" size={30} strokeWidth={1.7} />, label: "Balet", href: "/kerko?kategoria=balet" },
  { col: 4, row: 1, faint: true },
  // row 2
  { col: -0.5, row: 2, faint: true },
  { col: 0.5, row: 2, fill: "#FFF3CF", icon: <CategoryIcon name="wrench" size={34} strokeWidth={1.7} />, label: "Riparime", href: "/kerko?kategoria=riparime" },
  { col: 1.5, row: 2, fill: "#FFFFFF", icon: <CategoryIcon name="sparkles" size={34} strokeWidth={1.7} />, label: "Pastrim", href: "/kerko?kategoria=pastrim" },
  { col: 2.5, row: 2, fill: "#FFF3CF", icon: <CategoryIcon name="leaf" size={34} strokeWidth={1.7} />, label: "Kopsht", href: "/kerko?kategoria=kopsht" },
  { col: 3.5, row: 2, fill: "#FFFFFF", icon: <CategoryIcon name="baby" size={30} strokeWidth={1.7} />, label: "Nënë", href: "/kerko?kategoria=nane" },
  // row 3 — lower strip
  { col: 0, row: 3, faint: true },
  { col: 1, row: 3, fill: "#FFFFFF", icon: <CategoryIcon name="truck" size={30} strokeWidth={1.7} />, label: "Transport", href: "/kerko?kategoria=transport" },
  { col: 2, row: 3, fill: "#FFF3CF", icon: <CategoryIcon name="bookOpen" size={30} strokeWidth={1.7} />, label: "Tutor", href: "/kerko?kategoria=tutor" },
  { col: 3, row: 3, fill: "#FFFFFF", icon: <CategoryIcon name="car" size={30} strokeWidth={1.7} />, label: "Shofer", href: "/kerko?kategoria=shofer-personal" },
  { col: 4, row: 3, faint: true },
  // trailing faint row
  { col: 1.5, row: 4, faint: true },
  { col: 2.5, row: 4, fill: "#FFF3CF", icon: <CategoryIcon name="heart" size={28} strokeWidth={1.7} />, label: "Kujdesi", href: "/kerko?kategoria=kujdes-pleq" },
  { col: 3.5, row: 4, faint: true },
];

export default function Honeycomb({ size = 104 }: { size?: number }) {
  const h = size * RATIO;
  const dx = size;
  const dy = h * 0.75;

  const cols = CELLS.map((c) => c.col);
  const rows = CELLS.map((c) => c.row);
  const minCol = Math.min(...cols);
  const width = (Math.max(...cols) - minCol) * dx + size;
  const height = (Math.max(...rows) - Math.min(...rows)) * dy + h;

  return (
    <div className="relative select-none" style={{ width, height }} aria-label="Kategoritë e shërbimeve">
      {CELLS.map((c, i) => {
        const left = (c.col - minCol) * dx;
        const top = c.row * dy;
        const stroke = c.faint ? "#F0E6CE" : c.stroke ?? "#FFB800";

        /* clickable bee cell */
        if (c.bee) {
          return (
            <div key={i} className="absolute" style={{ left, top, width: size, height: h }}>
              <BeeCell size={size} height={h} />
            </div>
          );
        }

        /* faint outline cell */
        if (c.faint) {
          return (
            <div key={i} className="absolute" style={{ left, top, width: size, height: h }}>
              <svg viewBox="0 0 100 115.47" width={size} height={h} aria-hidden="true">
                <path d={HEX_D} fill="transparent" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
              </svg>
            </div>
          );
        }

        /* category link cell */
        const inner = (
          <>
            <svg
              viewBox="0 0 100 115.47"
              width={size}
              height={h}
              className="drop-shadow-[0_6px_14px_rgba(232,157,0,0.12)] transition-colors duration-200 group-hover:[&_path]:fill-[#FFE9A8] group-hover:[&_path]:stroke-[#E89D00]"
              aria-hidden="true"
            >
              <path d={HEX_D} fill={c.fill ?? "#FFFFFF"} stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gold-dark">
              {c.icon}
              {c.label && (
                <span className="mt-1 text-center text-[10px] font-bold leading-tight text-ink">
                  {c.label}
                </span>
              )}
            </div>
            {c.label && (
              <span className="pointer-events-none absolute bottom-full left-1/2 z-30 -mb-1.5 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:mb-0.5 group-hover:opacity-100">
                <span className="block whitespace-nowrap rounded-full border border-gold bg-white px-3 py-1 text-xs font-bold text-ink shadow-lift">
                  {c.label}
                </span>
                <span className="mx-auto block h-3.5 w-[2px] bg-gold" />
              </span>
            )}
          </>
        );

        return (
          <div key={i} className="absolute" style={{ left, top, width: size, height: h }}>
            {c.href ? (
              <Link href={c.href} draggable={false} className="group relative block h-full w-full hover:z-20">
                {inner}
              </Link>
            ) : (
              <div className="group relative h-full w-full">{inner}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
