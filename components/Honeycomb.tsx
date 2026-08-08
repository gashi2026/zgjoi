import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import BeeCell from "./BeeCell";
import { HEX_D, HEX_RATIO as RATIO } from "@/lib/hex";

/* Ballerina silhouette — traced from the classic pose: bun, arms out,
   wide tutu, crossed legs en pointe. Filled in the brand gold. */
export function Ballerina({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 100 135" fill="currentColor" aria-hidden="true">
      {/* bun */}
      <ellipse cx="53" cy="6" rx="6" ry="5" />
      {/* head */}
      <circle cx="50" cy="16" r="9" />
      {/* neck */}
      <path d="M47 24 L53 24 L52 31 L48 31 Z" />
      {/* torso / bodice */}
      <path d="M44 30 C42 38 41 46 42 52 L58 52 C59 46 58 38 56 30 C53 32 47 32 44 30 Z" />
      {/* left arm — out and slightly down */}
      <path d="M44 33 C34 36 22 42 8 52 C6.5 53 7 55.5 9 55 C23 50 35 44 45 40 Z" />
      {/* right arm — out and slightly down */}
      <path d="M56 33 C66 36 78 42 92 52 C93.5 53 93 55.5 91 55 C77 50 65 44 55 40 Z" />
      {/* tutu — wide layered skirt */}
      <path d="M42 51 C28 54 18 60 14 66 C24 71 38 73 50 73 C62 73 76 71 86 66 C82 60 72 54 58 51 Z" />
      {/* left leg — straight down */}
      <path d="M46 72 C45 88 44 104 43 118 L48 118 C49 104 49.5 88 50 73 Z" />
      {/* right leg — crossing behind to pointe */}
      <path d="M54 72 C55 86 55 100 52 112 C51 117 49 122 47 126 L52 127 C55 121 57 114 58 106 C59 95 59 84 58 73 Z" />
      {/* pointe feet */}
      <path d="M43 118 L41 127 C41 129 43 130 44 128 L48 119 Z" />
      <path d="M47 126 L45 133 C45 135 47 135.5 48 134 L52 127 Z" />
    </svg>
  );
}

type Cell = {
  col: number;
  row: number;
  fill?: string;
  icon?: React.ReactNode;
  label?: string;
  href?: string;
  faint?: boolean;
  bee?: boolean;
};

/* Diagonal band: starts bottom-left (under the search bar) and climbs
   to the top-right, with faint ghost cells trailing off both ends —
   same composition as the live site, now with more categories. */
const CELLS: Cell[] = [
  // row 5 — bottom tail (ghosts slide under the search bar)
  { col: -1, row: 5, faint: true },
  { col: 0, row: 5, faint: true },
  { col: 1, row: 5, fill: "#FFF3CF", icon: <CategoryIcon name="home" size={34} strokeWidth={1.7} />, label: "Ndërtim", href: "/kerko?kategoria=ndertim" },
  { col: 2, row: 5, fill: "#FFFFFF", icon: <CategoryIcon name="droplets" size={32} strokeWidth={1.7} />, label: "Hidraulik", href: "/kerko?kategoria=hidraulik" },
  { col: 3, row: 5, faint: true },

  // row 4
  { col: -0.5, row: 4, faint: true },
  { col: 0.5, row: 4, faint: true },
  { col: 1.5, row: 4, fill: "#FFF3CF", icon: <CategoryIcon name="paintbrush" size={32} strokeWidth={1.7} />, label: "Piktor", href: "/kerko?kategoria=piktor" },
  { col: 2.5, row: 4, fill: "#FFFFFF", icon: <CategoryIcon name="zap" size={32} strokeWidth={1.7} />, label: "Elektricist", href: "/kerko?kategoria=elektricist" },
  { col: 3.5, row: 4, fill: "#FFF3CF", icon: <CategoryIcon name="sparkles" size={32} strokeWidth={1.7} />, label: "Pastrim", href: "/kerko?kategoria=pastrim" },
  { col: 4.5, row: 4, faint: true },

  // row 3 — bee in the middle of the band
  { col: 0, row: 3, faint: true },
  { col: 1, row: 3, faint: true },
  { col: 2, row: 3, fill: "#FFFFFF", icon: <CategoryIcon name="truck" size={30} strokeWidth={1.7} />, label: "Transport", href: "/kerko?kategoria=transport" },
  { col: 3, row: 3, bee: true },
  { col: 4, row: 3, fill: "#FFFFFF", icon: <CategoryIcon name="leaf" size={32} strokeWidth={1.7} />, label: "Kopsht", href: "/kerko?kategoria=kopsht" },
  { col: 5, row: 3, faint: true },

  // row 2
  { col: 1.5, row: 2, faint: true },
  { col: 2.5, row: 2, fill: "#FFFFFF", icon: <CategoryIcon name="hammer" size={30} strokeWidth={1.7} />, label: "Mobilje", href: "/kerko?kategoria=mobilje" },
  { col: 3.5, row: 2, fill: "#FFF3CF", icon: <Ballerina size={26} />, label: "Balet", href: "/kerko?kategoria=balet" },
  { col: 4.5, row: 2, fill: "#FFFFFF", icon: <CategoryIcon name="baby" size={30} strokeWidth={1.7} />, label: "Dado", href: "/kerko?kategoria=nane" },
  { col: 5.5, row: 2, faint: true },

  // row 1
  { col: 2, row: 1, faint: true },
  { col: 3, row: 1, fill: "#FFF3CF", icon: <CategoryIcon name="heart" size={28} strokeWidth={1.7} />, label: "Kujdesi", href: "/kerko?kategoria=kujdes-pleq" },
  { col: 4, row: 1, fill: "#FFFFFF", icon: <CategoryIcon name="camera" size={30} strokeWidth={1.7} />, label: "Fotograf", href: "/kerko?kategoria=fotograf" },
  { col: 5, row: 1, fill: "#FFF3CF", icon: <CategoryIcon name="bookOpen" size={30} strokeWidth={1.7} />, label: "Tutor", href: "/kerko?kategoria=tutor" },
  { col: 6, row: 1, faint: true },

  // row 0 — top-right tip ends with Shofer, ghosts trail off
  { col: 3.5, row: 0, faint: true },
  { col: 4.5, row: 0, fill: "#FFFFFF", icon: <CategoryIcon name="car" size={30} strokeWidth={1.7} />, label: "Shofer", href: "/kerko?kategoria=shofer-personal" },
  { col: 5.5, row: 0, faint: true },
  { col: 6.5, row: 0, faint: true },
];

export default function Honeycomb({ size = 96 }: { size?: number }) {
  const h = size * RATIO;
  const dx = size;
  const dy = h * 0.75;

  const cols = CELLS.map((c) => c.col);
  const rows = CELLS.map((c) => c.row);
  const minCol = Math.min(...cols);
  const width = (Math.max(...cols) - minCol) * dx + size;
  const height = (Math.max(...rows) - Math.min(...rows)) * dy + h;

  return (
    <div
      className="relative select-none"
      style={{ width, height }}
      aria-label="Kategoritë e shërbimeve"
    >
      {CELLS.map((c, i) => {
        const left = (c.col - minCol) * dx;
        const top = c.row * dy;
        const stroke = c.faint ? "#F0E6CE" : "#FFB800";

        if (c.bee) {
          return (
            <div key={i} className="absolute" style={{ left, top, width: size, height: h }}>
              <BeeCell size={size} height={h} />
            </div>
          );
        }

        if (c.faint) {
          return (
            <div key={i} className="absolute" style={{ left, top, width: size, height: h }}>
              <svg viewBox="0 0 100 115.47" width={size} height={h} aria-hidden="true">
                <path d={HEX_D} fill="transparent" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
              </svg>
            </div>
          );
        }

        const inner = (
          <>
            <svg
              viewBox="0 0 100 115.47"
              width={size}
              height={h}
              className="drop-shadow-[0_6px_14px_rgba(232,157,0,0.12)]"
              aria-hidden="true"
            >
              <path d={HEX_D} fill={c.fill ?? "#FFFFFF"} stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-gold-dark transition-transform duration-200 group-hover:scale-110">
              {c.icon}
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
              <Link
                href={c.href}
                aria-label={`${c.label} — shiko profesionistët`}
                draggable={false}
                className="group relative block h-full w-full hover:z-20"
              >
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
