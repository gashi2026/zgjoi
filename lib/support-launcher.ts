/** Shared geometry for the gold support-chat launcher. Pure functions, no DOM. */

export const STORAGE_KEY = "zgjoi-support-launcher-v1";
export const BUTTON_SIZE = 56;
export const DRAG_THRESHOLD = 10;
export const SNAP_MS = 280;
export const HEADER_FALLBACK = 64;
export const BOTTOM_NAV_FALLBACK = 56;

export type Side = "left" | "right";

export type StoredLauncher = {
  v: 1;
  side: Side;
  yRatio: number;
};

export type LauncherPos = {
  side: Side;
  x: number;
  y: number;
};

export type LauncherBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

export type SafeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Convert a probe element that is pinned to the safe-area insets into inset widths. */
export function insetsFromSafeRect(
  rect: { top: number; right: number; bottom: number; left: number },
  width: number,
  height: number,
): SafeInsets {
  return {
    top: Math.max(0, rect.top),
    right: Math.max(0, width - rect.right),
    bottom: Math.max(0, height - rect.bottom),
    left: Math.max(0, rect.left),
  };
}


/** How far the button sits above the bottom of the viewport in the original layout. */
export function defaultOffsetFromBottom(opts: {
  productionHome: boolean;
  desktop: boolean;
}): number {
  if (opts.productionHome) return opts.desktop ? 30 : 110;
  return opts.desktop ? 24 : 96;
}

/** Side margin matching the original `right-4` / `right-3` classes. */
export function defaultSideMargin(productionHome: boolean): number {
  return productionHome ? 12 : 16;
}

export function parseStored(raw: string | null | undefined): StoredLauncher | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<StoredLauncher>;
    if (data?.v !== 1) return null;
    if (data.side !== "left" && data.side !== "right") return null;
    const yRatio = Number(data.yRatio);
    if (!Number.isFinite(yRatio)) return null;
    return { v: 1, side: data.side, yRatio: clamp01(yRatio) };
  } catch {
    return null;
  }
}

export function serializeStored(pos: LauncherPos, bounds: LauncherBounds): string {
  return JSON.stringify({
    v: 1,
    side: pos.side,
    yRatio: yRatioFromPos(pos.y, bounds),
  } satisfies StoredLauncher);
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function yRatioFromPos(y: number, bounds: LauncherBounds): number {
  const span = bounds.maxY - bounds.minY;
  if (span <= 0) return 1;
  return clamp01((y - bounds.minY) / span);
}

export function computeBounds(input: {
  width: number;
  height: number;
  safe: SafeInsets;
  headerBottom: number;
  bottomNavTop: number | null;
  margin?: number;
}): LauncherBounds {
  const margin = input.margin ?? 8;
  const minX = Math.max(0, input.safe.left) + margin;
  const maxX = input.width - Math.max(0, input.safe.right) - BUTTON_SIZE - margin;
  const minY = Math.max(input.headerBottom, Math.max(0, input.safe.top)) + margin;
  const bottomLimit =
    input.bottomNavTop == null
      ? input.height - Math.max(0, input.safe.bottom)
      : Math.min(input.bottomNavTop, input.height - Math.max(0, input.safe.bottom));
  const maxY = bottomLimit - BUTTON_SIZE - margin;
  return {
    minX,
    maxX: Math.max(minX, maxX),
    minY,
    maxY: Math.max(minY, maxY),
    width: input.width,
    height: input.height,
  };
}

export function clampPos(pos: LauncherPos, bounds: LauncherBounds): LauncherPos {
  return {
    side: pos.side,
    x: Math.min(bounds.maxX, Math.max(bounds.minX, pos.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, pos.y)),
  };
}

/** Snap the button to the nearer left or right edge; keep the released y, clamped. */
export function snapToEdge(pos: { x: number; y: number }, bounds: LauncherBounds): LauncherPos {
  const distLeft = Math.abs(pos.x - bounds.minX);
  const distRight = Math.abs(pos.x - bounds.maxX);
  const side: Side = distLeft <= distRight ? "left" : "right";
  return clampPos(
    { side, x: side === "left" ? bounds.minX : bounds.maxX, y: pos.y },
    bounds,
  );
}

export function posFromStored(
  stored: StoredLauncher | null,
  bounds: LauncherBounds,
  fallbackFromBottom: number,
): LauncherPos {
  const span = Math.max(0, bounds.maxY - bounds.minY);
  const y =
    stored != null
      ? bounds.minY + stored.yRatio * span
      : bounds.height - fallbackFromBottom - BUTTON_SIZE;
  const side: Side = stored?.side ?? "right";
  return clampPos(
    { side, x: side === "left" ? bounds.minX : bounds.maxX, y },
    bounds,
  );
}

/** Open the panel below the button when there is not enough room above it. */
export function panelOpensDown(
  buttonY: number,
  bounds: LauncherBounds,
  panelHeight = 280,
): boolean {
  return buttonY - bounds.minY < panelHeight;
}

export function movedBeyondThreshold(
  dx: number,
  dy: number,
  threshold = DRAG_THRESHOLD,
): boolean {
  return dx * dx + dy * dy > threshold * threshold;
}
