"use client";

import { useEffect, useRef, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import { categories } from "@/lib/data";

// Honeycomb grid with more cells and click-to-highlight
const HEX_R = 44;
const HEX_W = HEX_R * 2;
const HEX_H = Math.sqrt(3) * HEX_R;
const COLS = 9;
const ROWS = 6;

function hexCenter(col: number, row: number) {
  const x = col * HEX_W * 0.75 + HEX_R;
  const y = row * HEX_H + (col % 2 === 1 ? HEX_H / 2 : 0) + HEX_H / 2;
  return { x, y };
}

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

const GRID_W = COLS * HEX_W * 0.75 + HEX_R * 0.5;
const GRID_H = ROWS * HEX_H + HEX_H;

type Cell = {
  col: number;
  row: number;
  x: number;
  y: number;
  cat?: (typeof categories)[0];
  variant: "gold" | "honey" | "white" | "ghost";
};

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  let catIdx = 0;
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const { x, y } = hexCenter(col, row);
      // assign categories to some cells
      const hasCat = (col + row) % 3 === 0 && catIdx < categories.length;
      const variant: Cell["variant"] =
        hasCat ? "gold" : (col + row) % 5 === 0 ? "honey" : (col + row) % 7 === 0 ? "white" : "ghost";
      cells.push({
        col, row, x, y,
        cat: hasCat ? categories[catIdx++] : undefined,
        variant,
      });
    }
  }
  return cells;
}

const CELLS = buildCells();

export default function Honeycomb() {
  const [active, setActive] = useState<number | null>(null);
  const [bees, setBees] = useState<{ id: number; x: number; y: number; tx: number; ty: number }[]>([]);
  const nextBee = useRef(0);

  function handleClick(idx: number, x: number, y: number) {
    setActive(idx === active ? null : idx);
    // spawn a little bee emoji that floats upward
    const id = nextBee.current++;
    setBees((b) => [...b, { id, x, y, tx: x + (Math.random() - 0.5) * 80, ty: y - 90 }]);
    setTimeout(() => setBees((b) => b.filter((bee) => bee.id !== id)), 900);
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height: GRID_H * 0.72 }}>
      <svg
        viewBox={`0 0 ${GRID_W} ${GRID_H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="hglow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {CELLS.map((cell, idx) => {
          const isActive = active === idx;
          const fill =
            isActive ? "#FFB800" :
            cell.variant === "gold" ? "#FFF3CF" :
            cell.variant === "honey" ? "#FFFCF5" :
            cell.variant === "white" ? "#FFFFFF" : "#FAFAF8";
          const stroke = isActive ? "#FFB800" : cell.variant === "gold" ? "#FFD966" : "#EDE8E1";
          const r = isActive ? HEX_R - 1 : HEX_R - 2;

          return (
            <g
              key={idx}
              onClick={() => handleClick(idx, cell.x, cell.y)}
              className="cursor-pointer"
              filter={isActive ? "url(#hglow)" : undefined}
            >
              <polygon
                points={hexPoints(cell.x, cell.y, r)}
                fill={fill}
                stroke={stroke}
                strokeWidth={isActive ? 2 : 1}
                style={{ transition: "all 0.2s" }}
              />
              {cell.cat && (
                <text
                  x={cell.x}
                  y={cell.y + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={isActive ? "#7A5500" : "#8C8278"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {cell.cat.name.length > 10 ? cell.cat.name.slice(0, 9) + "…" : cell.cat.name}
                </text>
              )}
            </g>
          );
        })}

        {/* bee emoji on click */}
        {bees.map((bee) => (
          <text
            key={bee.id}
            x={bee.tx}
            y={bee.ty}
            fontSize={22}
            textAnchor="middle"
            style={{
              animation: "bee-float 0.9s ease-out forwards",
              pointerEvents: "none",
            }}
          >
            🐝
          </text>
        ))}
      </svg>

      <style>{`
        @keyframes bee-float {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-60px); }
        }
      `}</style>
    </div>
  );
}
