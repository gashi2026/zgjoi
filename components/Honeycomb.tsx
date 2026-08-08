"use client";

import { useRef, useState } from "react";

const HEX_R = 38;
const HEX_W = HEX_R * 2;
const HEX_H = Math.sqrt(3) * HEX_R;
const COLS = 7;
const ROWS = 5;

const CATEGORY_LABELS = [
  "Elektricist", "Hidraulik", "Pastrim", "Piktor", "Ndërtim",
  "Transport", "Tutor", "Fotograf", "Kopsht", "Balet",
  "Nënë", "Florist", "Shofer", "Dekorues", "Muzikë",
  "Avokat", "Riparime", "Klimatizim", "Marketing", "IT",
];

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

type Cell = { col: number; row: number; x: number; y: number; label?: string; variant: "gold" | "honey" | "white" };

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  let labelIdx = 0;
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const { x, y } = hexCenter(col, row);
      const hasCat = (col + row) % 3 === 0 && labelIdx < CATEGORY_LABELS.length;
      const variant: Cell["variant"] =
        hasCat ? "gold" : (col + row) % 4 === 0 ? "honey" : "white";
      cells.push({ col, row, x, y, label: hasCat ? CATEGORY_LABELS[labelIdx++] : undefined, variant });
    }
  }
  return cells;
}

const CELLS = buildCells();

export default function Honeycomb() {
  const [active, setActive] = useState<number | null>(null);
  const [bees, setBees] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextBee = useRef(0);

  function handleClick(idx: number, x: number, y: number) {
    setActive(idx === active ? null : idx);
    const id = nextBee.current++;
    setBees((b) => [...b, { id, x, y }]);
    setTimeout(() => setBees((b) => b.filter((bee) => bee.id !== id)), 900);
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${GRID_W} ${GRID_H}`}
        className="w-full h-auto"
        aria-hidden="true"
      >
        {CELLS.map((cell, idx) => {
          const isActive = active === idx;
          const fill =
            isActive ? "#FFB800" :
            cell.variant === "gold" ? "#FFF3CF" :
            cell.variant === "honey" ? "#FFFCF5" : "#FFFFFF";
          const stroke = isActive ? "#FFB800" : cell.variant === "gold" ? "#FFD966" : "#EDE8E1";

          return (
            <g
              key={idx}
              onClick={() => handleClick(idx, cell.x, cell.y)}
              className="cursor-pointer"
            >
              <polygon
                points={hexPoints(cell.x, cell.y, HEX_R - 2)}
                fill={fill}
                stroke={stroke}
                strokeWidth={isActive ? 2 : 1}
                style={{ transition: "all 0.2s" }}
              />
              {cell.label && (
                <text
                  x={cell.x}
                  y={cell.y + 5}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill={isActive ? "#5A3800" : "#8C8278"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {cell.label}
                </text>
              )}
            </g>
          );
        })}

        {bees.map((bee) => (
          <text
            key={bee.id}
            x={bee.x}
            y={bee.y}
            fontSize={20}
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
