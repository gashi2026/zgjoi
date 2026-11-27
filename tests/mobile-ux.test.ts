import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HEX_RATIO } from "../lib/hex";
import {
  DEFAULT_CELL_SIZE,
  ROWS_SHORT,
  ROWS_TALL,
  isCategorySlot,
  isDecorBee,
  layoutMobileHexBelt,
} from "../lib/mobile-hex-layout";
import {
  BUTTON_SIZE,
  DRAG_THRESHOLD,
  STORAGE_KEY,
  clampPos,
  computeBounds,
  defaultOffsetFromBottom,
  insetsFromSafeRect,
  movedBeyondThreshold,
  panelOpensDown,
  parseStored,
  posFromStored,
  serializeStored,
  snapToEdge,
  yRatioFromPos,
} from "../lib/support-launcher";
import { serviceCategories } from "../lib/service-categories";

const cats = serviceCategories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }));

test("mobile honeycomb uses larger cells and leaves room between categories", () => {
  assert.ok(DEFAULT_CELL_SIZE >= 68, "hexes should be visibly larger than the old 52px cells");
  assert.equal(ROWS_TALL, 3);
  assert.equal(ROWS_SHORT, 2);

  const laid = layoutMobileHexBelt({ cats, rows: ROWS_TALL, size: DEFAULT_CELL_SIZE });
  const categories = laid.cells.filter((c) => c.cat);
  const empties = laid.cells.filter((c) => c.empty);
  const bees = laid.cells.filter((c) => c.decor);

  assert.equal(categories.length, cats.length, "every profession appears once");
  assert.deepEqual(
    [...new Set(categories.map((c) => c.cat!.slug))].sort(),
    cats.map((c) => c.slug).sort(),
  );
  assert.equal(categories.length, new Set(categories.map((c) => c.cat!.slug)).size, "no repeated professions");
  assert.ok(empties.length >= 8, "a generous number of empty comb cells");
  assert.ok(empties.length + bees.length >= categories.length * 0.8, "empty and bee cells keep the hive airy");
  assert.ok(empties.length >= bees.length, "most in-between cells are empty, not bees");
  assert.ok(bees.length >= 1, "decorative bees remain");
  assert.ok(laid.cells.every((c) => c.decor || c.empty || c.cat), "every cell is a category, a bee, or empty");
  assert.ok(
    categories.every((c) => c.x >= 0 && c.y >= 0),
    "cells sit on the honeycomb grid",
  );

  const hexHeight = DEFAULT_CELL_SIZE * HEX_RATIO;
  assert.ok(DEFAULT_CELL_SIZE >= 44 && hexHeight >= 44, "tap targets are at least 44px");
  assert.ok(laid.beltHeight > hexHeight, "rows pack into a honeycomb, not a single line");
});

test("empty honeycomb cells sit between category cells on the checkerboard", () => {
  const laid = layoutMobileHexBelt({ cats, rows: ROWS_TALL, size: DEFAULT_CELL_SIZE });
  for (const cell of laid.cells) {
    const col = Math.round((cell.x - (cell.row % 2 === 1 ? DEFAULT_CELL_SIZE / 2 : 0)) / DEFAULT_CELL_SIZE);
    if (cell.cat) assert.equal(isCategorySlot(col, cell.row), true);
    if (cell.decor) assert.equal(isDecorBee(col, cell.row), true);
    if (cell.empty) {
      assert.equal(cell.cat, null);
      assert.notEqual(isDecorBee(col, cell.row), true);
    }
  }
  // Each category should have an empty or bee neighbour in the same row when one exists.
  const byRow = new Map<number, typeof laid.cells>();
  for (const cell of laid.cells) {
    const list = byRow.get(cell.row) ?? [];
    list.push(cell);
    byRow.set(cell.row, list);
  }
  let neighbouringGaps = 0;
  for (const row of byRow.values()) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    for (let i = 0; i < ordered.length; i++) {
      if (!ordered[i].cat) continue;
      const left = ordered[i - 1];
      const right = ordered[i + 1];
      if ((left && (left.empty || left.decor)) || (right && (right.empty || right.decor))) {
        neighbouringGaps++;
      }
    }
  }
  assert.ok(neighbouringGaps >= cats.length * 0.8, "almost every category sits beside an empty cell");
});

test("the magnetic launcher snaps to the nearer edge and stays inside safe areas", () => {
  const bounds = computeBounds({
    width: 390,
    height: 844,
    safe: { top: 47, right: 0, bottom: 34, left: 0 },
    headerBottom: 64 + 47,
    bottomNavTop: 844 - 34 - 56,
    margin: 16,
  });
  assert.ok(bounds.minY >= 64 + 47);
  assert.ok(bounds.maxY + BUTTON_SIZE <= 844 - 34 - 56);
  assert.equal(bounds.minX, 16);
  assert.equal(bounds.maxX, 390 - 16 - BUTTON_SIZE);

  const snappedRight = snapToEdge({ x: 300, y: 500 }, bounds);
  assert.equal(snappedRight.side, "right");
  assert.equal(snappedRight.x, bounds.maxX);
  assert.equal(snappedRight.y, 500);

  const snappedLeft = snapToEdge({ x: 20, y: 500 }, bounds);
  assert.equal(snappedLeft.side, "left");
  assert.equal(snappedLeft.x, bounds.minX);

  const mid = snapToEdge({ x: (bounds.minX + bounds.maxX) / 2 - 1, y: 500 }, bounds);
  assert.equal(mid.side, "left");

  const tooHigh = clampPos({ side: "right", x: bounds.maxX, y: 0 }, bounds);
  assert.equal(tooHigh.y, bounds.minY);
  const tooLow = clampPos({ side: "right", x: bounds.maxX, y: 9999 }, bounds);
  assert.equal(tooLow.y, bounds.maxY);
});

test("the launcher remembers a side and vertical ratio, and a small move stays a tap", () => {
  const bounds = computeBounds({
    width: 390,
    height: 844,
    safe: { top: 0, right: 0, bottom: 0, left: 0 },
    headerBottom: 64,
    bottomNavTop: null,
    margin: 16,
  });
  const saved = { side: "left" as const, x: bounds.minX, y: bounds.minY + (bounds.maxY - bounds.minY) * 0.4 };
  const raw = serializeStored(saved, bounds);
  const parsed = parseStored(raw);
  assert.equal(parsed?.v, 1);
  assert.equal(parsed?.side, "left");
  assert.ok(Math.abs((parsed?.yRatio ?? -1) - 0.4) < 0.001);
  assert.equal(parseStored("not-json"), null);
  assert.equal(parseStored('{"v":1,"side":"up","yRatio":0.2}'), null);

  const restored = posFromStored(parsed, bounds, 96);
  assert.equal(restored.side, "left");
  assert.ok(Math.abs(restored.y - saved.y) < 1);
  assert.equal(restored.x, bounds.minX);

  const def = posFromStored(null, bounds, defaultOffsetFromBottom({ productionHome: false, desktop: false }));
  assert.equal(def.side, "right");
  assert.equal(def.x, bounds.maxX);

  assert.equal(movedBeyondThreshold(3, 3), false);
  assert.equal(movedBeyondThreshold(DRAG_THRESHOLD + 1, 0), true);
  assert.equal(yRatioFromPos(bounds.minY, bounds), 0);
  assert.equal(yRatioFromPos(bounds.maxY, bounds), 1);
  assert.equal(panelOpensDown(bounds.minY + 40, bounds, 280), true);
  assert.equal(panelOpensDown(bounds.maxY, bounds, 280), false);
  assert.equal(STORAGE_KEY, "zgjoi-support-launcher-v1");
});

test("safe-area insets are read from a filled probe, not a 0×0 box", () => {
  // A 0×0 probe pinned to the corners reports right=0 and bottom=0, which
  // would look like 390/844 of inset and pin the button to the top left.
  const broken = insetsFromSafeRect({ top: 47, right: 0, bottom: 0, left: 0 }, 390, 844);
  assert.equal(broken.right, 390);
  assert.equal(broken.bottom, 844);

  const ok = insetsFromSafeRect({ top: 47, right: 390, bottom: 810, left: 0 }, 390, 844);
  assert.equal(ok.top, 47);
  assert.equal(ok.right, 0);
  assert.equal(ok.bottom, 34);
  assert.equal(ok.left, 0);

  const bounds = computeBounds({
    width: 390,
    height: 844,
    safe: ok,
    headerBottom: 64 + 47,
    bottomNavTop: null,
    margin: 16,
  });
  assert.ok(bounds.maxX > bounds.minX, "there is room on both sides");
  assert.equal(bounds.maxX, 390 - 16 - 56);
  const defRight = { side: "right", x: bounds.maxX, y: 844 - 96 - 56 };
  assert.equal(defRight.x, bounds.maxX);
  assert.ok(defRight.x > 200);
});

test("the chat button and honeycomb source keep the gold hive styling", () => {
  const chat = readFileSync("components/SupportChat.tsx", "utf8");
  assert.match(chat, /useMagneticLauncher/);
  assert.match(chat, /bg-green-500/);
  assert.match(chat, /bg-gray-400/);
  assert.match(chat, /Headset/);
  assert.match(chat, /touchAction: "none"/);
  assert.match(chat, /data-support-launcher/);

  const hook = readFileSync("components/useMagneticLauncher.ts", "utf8");
  assert.match(hook, /localStorage/);
  assert.match(hook, /STORAGE_KEY/);
  assert.match(hook, /snapToEdge/);
  assert.match(hook, /safe-area-inset/);
  assert.match(hook, /data-zg-bottom-nav/);
  assert.match(hook, /touchmove/);

  const belt = readFileSync("components/MobileHexBelt.tsx", "utf8");
  assert.match(belt, /layoutMobileHexBelt/);
  assert.match(belt, /#F2E9D4/);
  assert.match(belt, /#FFFAEC/);
  assert.match(belt, /aria-hidden="true"/);
  assert.match(belt, /minWidth: 44/);
  assert.doesNotMatch(belt, /n\+\+ % cats\.length/);

  const nav = readFileSync("components/MobileBottomNav.tsx", "utf8");
  assert.match(nav, /data-zg-bottom-nav/);
});
