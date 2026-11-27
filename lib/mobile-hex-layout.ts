import { HEX_RATIO } from "./hex";

export type HexCat = { slug: string; name: string; icon: string };

export type PlacedHex = {
  key: string;
  cat: HexCat | null;
  /** Decorative bee cell. */
  decor?: boolean;
  /** Faint empty comb cell, not clickable. */
  empty?: boolean;
  x: number;
  y: number;
  row: number;
  honey: boolean;
};

export const DEFAULT_CELL_SIZE = 70;
export const ROWS_TALL = 3;
export const ROWS_SHORT = 2;
export const TOP_ROOM = 72;
export const BOTTOM_ROOM = 58;
export const TOP_ROOM_SHORT = 50;
export const BOTTOM_ROOM_SHORT = 40;

/**
 * Sparse decorative bees, never two touching in the same row, and only on
 * the "empty" checkerboard parity so category slots stay free.
 */
export function isDecorBee(col: number, row: number): boolean {
  if ((col + row) % 2 === 0) return false;
  // Sparse, staggered, never adjacent in a row: about one bee every seven columns.
  if (row === 0) return col % 7 === 1;
  if (row === 1) return col % 7 === 4;
  if (row === 2) return col % 7 === 3;
  return col % 7 === 6;
}


/** Even parity cells carry a category, until the list of categories runs out. */
export function isCategorySlot(col: number, row: number): boolean {
  return (col + row) % 2 === 0;
}

export function layoutMobileHexBelt({
  cats,
  rows,
  size,
  minColumns = 8,
}: {
  cats: HexCat[];
  rows: number;
  size: number;
  minColumns?: number;
}): { cells: PlacedHex[]; groupWidth: number; beltHeight: number; columns: number } {
  const h = size * HEX_RATIO;
  const dx = size;
  const dy = h * 0.75;

  const categorySlotsIn = (cols: number) => {
    let n = 0;
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) if (isCategorySlot(col, row)) n++;
    }
    return n;
  };

  let columns = Math.max(minColumns, 1);
  while (categorySlotsIn(columns) < cats.length && columns < cats.length * 2 + 8) {
    columns++;
  }

  const list: PlacedHex[] = [];
  let n = 0;
  for (let col = 0; col < columns; col++) {
    for (let row = 0; row < rows; row++) {
      const x = col * dx + (row % 2 === 1 ? dx / 2 : 0);
      const y = row * dy;
      const honey = (col * 2 + row) % 3 === 0;
      if (isDecorBee(col, row)) {
        list.push({ key: `d-${col}-${row}`, cat: null, decor: true, x, y, row, honey });
      } else if (isCategorySlot(col, row) && n < cats.length) {
        list.push({ key: `c-${col}-${row}`, cat: cats[n++], x, y, row, honey });
      } else {
        list.push({ key: `e-${col}-${row}`, cat: null, empty: true, x, y, row, honey });
      }
    }
  }

  return {
    cells: list,
    groupWidth: columns * dx,
    beltHeight: (rows - 1) * dy + h,
    columns,
  };
}
