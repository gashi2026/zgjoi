"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUTTON_SIZE,
  DRAG_THRESHOLD,
  HEADER_FALLBACK,
  SNAP_MS,
  STORAGE_KEY,
  clampPos,
  computeBounds,
  defaultOffsetFromBottom,
  defaultSideMargin,
  movedBeyondThreshold,
  parseStored,
  posFromStored,
  insetsFromSafeRect,
  serializeStored,
  snapToEdge,
  type LauncherBounds,
  type LauncherPos,
} from "@/lib/support-launcher";

function viewportSize(): { width: number; height: number } {
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
  };
}

function readSafeInsets() {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  // Fill the rectangle inside the safe-area insets. A 0×0 box would make
  // the right and bottom edges 0, so the button would always clamp to the
  // top-left corner.
  probe.style.cssText =
    "position:fixed;top:env(safe-area-inset-top,0px);right:env(safe-area-inset-right,0px);bottom:env(safe-area-inset-bottom,0px);left:env(safe-area-inset-left,0px);pointer-events:none;visibility:hidden";
  document.body.appendChild(probe);
  const r = probe.getBoundingClientRect();
  const { width, height } = viewportSize();
  probe.remove();
  return insetsFromSafeRect(r, width, height);
}

function measureHeaderBottom(): number {
  const header = document.querySelector("header");
  if (header) {
    const bottom = header.getBoundingClientRect().bottom;
    if (Number.isFinite(bottom) && bottom > 0) return bottom;
  }
  return HEADER_FALLBACK + readSafeInsets().top;
}

function measureBottomNavTop(): number | null {
  const nav = document.querySelector("[data-zg-bottom-nav]");
  if (!nav) return null;
  const top = nav.getBoundingClientRect().top;
  return Number.isFinite(top) ? top : null;
}

function currentBounds(productionHome: boolean): LauncherBounds {
  const { width, height } = viewportSize();
  return computeBounds({
    width,
    height,
    safe: readSafeInsets(),
    headerBottom: measureHeaderBottom(),
    bottomNavTop: measureBottomNavTop(),
    margin: defaultSideMargin(productionHome),
  });
}

function isDesktop(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function useMagneticLauncher({ productionHome = false }: { productionHome?: boolean }) {
  const [pos, setPos] = useState<LauncherPos | null>(null);
  const [bounds, setBounds] = useState<LauncherBounds | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const posRef = useRef<LauncherPos | null>(null);
  const boundsRef = useRef<LauncherBounds | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    grabX: number;
    grabY: number;
    moved: boolean;
    lastX: number;
    lastY: number;
  } | null>(null);
  const snapTimer = useRef<number>(0);

  const apply = useCallback((next: LauncherPos, nextBounds: LauncherBounds) => {
    posRef.current = next;
    boundsRef.current = nextBounds;
    setPos(next);
    setBounds(nextBounds);
  }, []);

  const recompute = useCallback(
    (storedOrCurrent: "stored" | "keep") => {
      const nextBounds = currentBounds(productionHome);
      const fallback = defaultOffsetFromBottom({
        productionHome,
        desktop: isDesktop(),
      });
      if (storedOrCurrent === "stored") {
        const stored = parseStored(localStorage.getItem(STORAGE_KEY));
        apply(posFromStored(stored, nextBounds, fallback), nextBounds);
        return;
      }
      const current = posRef.current;
      if (!current) {
        apply(posFromStored(null, nextBounds, fallback), nextBounds);
        return;
      }
      apply(
        clampPos({ ...current, x: current.side === "left" ? nextBounds.minX : nextBounds.maxX, y: current.y }, nextBounds),
        nextBounds,
      );
    },
    [apply, productionHome],
  );

  useEffect(() => {
    const onChange = () => recompute("keep");
    window.addEventListener("resize", onChange);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onChange);
    vv?.addEventListener("scroll", onChange);
    // Defer the first paint-driven position so we don't setState inside the effect body.
    const frame = window.requestAnimationFrame(() => recompute("stored"));
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onChange);
      vv?.removeEventListener("resize", onChange);
      vv?.removeEventListener("scroll", onChange);
    };
  }, [recompute]);

  useEffect(() => {
    return () => {
      if (snapTimer.current) window.clearTimeout(snapTimer.current);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, []);

  const persist = useCallback((next: LauncherPos, nextBounds: LauncherBounds) => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeStored(next, nextBounds));
    } catch {
      /* private mode or full storage */
    }
  }, []);

  const lockScroll = (lock: boolean) => {
    document.documentElement.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
    document.body.style.touchAction = lock ? "none" : "";
  };

  useEffect(() => {
    const prevent = (event: TouchEvent) => {
      if (dragRef.current?.moved) event.preventDefault();
    };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      moved: false,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture is optional */
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && !movedBeyondThreshold(dx, dy, DRAG_THRESHOLD)) return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
      setSnapping(false);
      lockScroll(true);
    }
    event.preventDefault();
    const nextBounds = currentBounds(productionHome);
    const next = clampPos(
      {
        side: posRef.current?.side ?? "right",
        x: event.clientX - drag.grabX,
        y: event.clientY - drag.grabY,
      },
      nextBounds,
    );
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    apply(next, nextBounds);
  };

  const endPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return "none";
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    lockScroll(false);
    if (!drag.moved) {
      setDragging(false);
      return "tap";
    }
    const nextBounds = currentBounds(productionHome);
    const origin = posRef.current ?? {
      side: "right" as const,
      x: event.clientX - drag.grabX,
      y: event.clientY - drag.grabY,
    };
    const snapped = snapToEdge(origin, nextBounds);
    setSnapping(true);
    setDragging(false);
    apply(snapped, nextBounds);
    persist(snapped, nextBounds);
    if (snapTimer.current) window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => setSnapping(false), SNAP_MS + 20);
    return "drag";
  };

  const transition = snapping
    ? `left ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
    : "none";

  return {
    pos,
    bounds,
    dragging,
    snapping,
    transition,
    buttonSize: BUTTON_SIZE,
    onPointerDown,
    onPointerMove,
    endPointer,
  };
}
