import {
  Home,
  Zap,
  Droplets,
  Paintbrush,
  Wrench,
  Sparkles,
  Truck,
  Leaf,
  Camera,
  Music,
  Baby,
  BookOpen,
  Car,
  Heart,
} from "lucide-react";
import { Bee } from "./Brand";

const HEX_D = "M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87 Z";
const RATIO = 1.1547;

type Cell = {
  col: number;
  row: number;
  fill?: string;
  stroke?: string;
  icon?: React.ReactNode;
  faint?: boolean;
};

const CELLS: Cell[] = [
  // row 0
  { col: 0.5, row: 0, fill: "#FFFFFF", icon: <Zap size={34} strokeWidth={1.7} /> },
  { col: 1.5, row: 0, fill: "#FFF3CF", icon: <Home size={38} strokeWidth={1.7} /> },
  { col: 2.5, row: 0, fill: "#FFFFFF", icon: <Camera size={32} strokeWidth={1.7} /> },
  { col: 3.5, row: 0, faint: true },
  // row 1
  { col: 0, row: 1, fill: "#FFFFFF", icon: <Paintbrush size={34} strokeWidth={1.7} /> },
  { col: 1, row: 1, fill: "#FFF3CF", icon: <Bee size={46} /> },
  { col: 2, row: 1, fill: "#FFFFFF", icon: <Droplets size={34} strokeWidth={1.7} /> },
  { col: 3, row: 1, fill: "#FFF3CF", icon: <Music size={30} strokeWidth={1.7} /> },
  { col: 4, row: 1, faint: true },
  // row 2
  { col: -0.5, row: 2, faint: true },
  { col: 0.5, row: 2, fill: "#FFF3CF", icon: <Wrench size={34} strokeWidth={1.7} /> },
  { col: 1.5, row: 2, fill: "#FFFFFF", icon: <Sparkles size={34} strokeWidth={1.7} /> },
  { col: 2.5, row: 2, fill: "#FFF3CF", icon: <Leaf size={34} strokeWidth={1.7} /> },
  { col: 3.5, row: 2, fill: "#FFFFFF", icon: <Baby size={30} strokeWidth={1.7} /> },
  // row 3
  { col: 0, row: 3, faint: true },
  { col: 1, row: 3, fill: "#FFFFFF", icon: <Truck size={30} strokeWidth={1.7} /> },
  { col: 2, row: 3, fill: "#FFF3CF", icon: <BookOpen size={30} strokeWidth={1.7} /> },
  { col: 3, row: 3, fill: "#FFFFFF", icon: <Car size={30} strokeWidth={1.7} /> },
  { col: 4, row: 3, faint: true },
  // row 4 — trailing edge
  { col: 1.5, row: 4, faint: true },
  { col: 2.5, row: 4, fill: "#FFF3CF", icon: <Heart size={28} strokeWidth={1.7} /> },
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
    <div
      className="relative select-none"
      style={{ width, height }}
      aria-hidden="true"
    >
      {CELLS.map((c, i) => {
        const left = (c.col - minCol) * dx;
        const top = c.row * dy;
        const stroke = c.faint ? "#F0E6CE" : c.stroke ?? "#FFB800";
        return (
          <div
            key={i}
            className="absolute"
            style={{ left, top, width: size, height: h }}
          >
            <svg
              viewBox="0 0 100 115.47"
              width={size}
              height={h}
              className={
                c.faint ? "" : "drop-shadow-[0_6px_14px_rgba(232,157,0,0.12)]"
              }
            >
              <path
                d={HEX_D}
                fill={c.faint ? "transparent" : c.fill ?? "#FFFFFF"}
                stroke={stroke}
                strokeWidth={c.faint ? 2 : 2.5}
                strokeLinejoin="round"
              />
            </svg>
            {c.icon && (
              <div className="absolute inset-0 flex items-center justify-center text-gold-dark">
                {c.icon}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
