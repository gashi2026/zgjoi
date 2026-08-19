"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type Msg = { id: string; body: string; fromAgent: boolean; time: string };
type Status = { online: boolean; localTime: string; nextOpenLabel: string };
type Pos = { x: number; y: number };

const STORAGE_KEY = "zgjoi_support_ticket";
const POS_KEY = "zgjoi_support_pos";
const HOURS_LABEL = "E hënë–e premte, 09:00–17:00";

const BTN = 56;
const MARGIN = 12;

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------- draggable, edge-snapped */
  const wrapRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Pos>({ x: 0, y: 0 });
  const [pos, setPos] = useState<Pos | null>(null); // only for anchoring the panel
  const [view, setView] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const dragging = useRef(false);
  const moved = useRef(0);
  const grab = useRef<Pos>({ x: 0, y: 0 });

  const bounds = () => ({
    maxX: window.innerWidth - BTN - MARGIN,
    maxY: window.innerHeight - BTN - MARGIN,
  });

  const clamp = (p: Pos): Pos => {
    const { maxX, maxY } = bounds();
    return {
      x: Math.max(MARGIN, Math.min(maxX, p.x)),
      y: Math.max(MARGIN, Math.min(maxY, p.y)),
    };
  };

  /* nearest edge — left, right, top or bottom */
  const snap = (p: Pos): Pos => {
    const { maxX, maxY } = bounds();
    const c = clamp(p);
    const d = {
      left: c.x - MARGIN,
      right: maxX - c.x,
      top: c.y - MARGIN,
      bottom: maxY - c.y,
    };
    const nearest = (Object.keys(d) as (keyof typeof d)[]).reduce((a, b) =>
      d[a] <= d[b] ? a : b
    );
    if (nearest === "left") return { x: MARGIN, y: c.y };
    if (nearest === "right") return { x: maxX, y: c.y };
    if (nearest === "top") return { x: c.x, y: MARGIN };
    return { x: c.x, y: maxY };
  };

  /* write straight to the DOM while dragging — no React work per frame */
  const paint = (p: Pos, animate: boolean) => {
    const el = wrapRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  };

  useEffect(() => {
    const fallback = (): Pos => ({
      x: window.innerWidth - BTN - MARGIN,
      y: window.innerHeight - BTN - (window.innerWidth < 1024 ? 110 : 30),
    });
    let start = fallback();
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const p = JSON.parse(saved) as Pos;
        if (typeof p.x === "number" && typeof p.y === "number") start = p;
      }
    } catch { /* private mode */ }

    const snapped = snap(start);
    posRef.current = snapped;
    setPos(snapped);
    paint(snapped, false);

    setView({ w: window.innerWidth, h: window.innerHeight });

    const onResize = () => {
      setView({ w: window.innerWidth, h: window.innerHeight });
      const next = snap(posRef.current);
      posRef.current = next;
      setPos(next);
      paint(next, true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = 0;
    grab.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    moved.current += Math.abs(e.movementX) + Math.abs(e.movementY);
    const next = clamp({ x: e.clientX - grab.current.x, y: e.clientY - grab.current.y });
    posRef.current = next;
    paint(next, false); // follows the finger exactly, nothing re-renders
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (moved.current < 6) {
      setOpen((o) => !o);
      return;
    }

    const landed = snap(posRef.current); // glide to the closest edge
    posRef.current = landed;
    paint(landed, true);
    setPos(landed);
    try { localStorage.setItem(POS_KEY, JSON.stringify(landed)); } catch { /* ignore */ }
  };

  /* ------------------------------------------------------ messaging */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setTicketId(saved);
    } catch { /* private mode */ }
  }, []);

  const poll = useCallback(async () => {
    try {
      const url = ticketId
        ? `/api/support/messages?ticketId=${encodeURIComponent(ticketId)}`
        : "/api/support/messages";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status) setStatus(data.status);
      if (data.messages) setMessages(data.messages);
    } catch { /* offline */ }
  }, [ticketId]);

  useEffect(() => { poll(); }, [poll]);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [open, poll]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");

    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      body,
      fromAgent: false,
      time: new Date().toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((m) => [...m, optimistic]);
    setText("");

    try {
      const res = await fetch("/api/support/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, body }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Diçka shkoi keq.");
      } else if (data.ticketId && data.ticketId !== ticketId) {
        setTicketId(data.ticketId);
        try { sessionStorage.setItem(STORAGE_KEY, data.ticketId); } catch { /* ignore */ }
      }
      await poll();
    } catch {
      setError("Nuk u lidhem me serverin.");
    } finally {
      setSending(false);
    }
  }

  const online = status?.online ?? false;

  /* The panel is placed in screen coordinates, next to the bubble where
     there's room, and always nudged back inside the viewport. */
  const panelBox = (() => {
    const vw = view.w || 360;
    const vh = view.h || 640;
    const w = Math.min(360, vw - 24);
    const h = Math.min(520, Math.round(vh * 0.62));
    const bx = pos?.x ?? vw - BTN - MARGIN;
    const by = pos?.y ?? vh - BTN - MARGIN;

    // above the bubble if it fits, otherwise below
    let top = by - h - 12;
    if (top < 12) top = by + BTN + 12;
    top = Math.max(12, Math.min(vh - h - 12, top));

    // line the panel up with the bubble, then pull it back on screen
    let left = bx + BTN - w;
    if (left < 12) left = bx;
    left = Math.max(12, Math.min(vw - w - 12, left));

    return { left, top, w, h };
  })();

  return (
    <>
      <div
      ref={wrapRef}
      className="fixed left-0 top-0 z-[80] will-change-transform"
      style={{ visibility: pos ? "visible" : "hidden" }}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={open ? "Mbyll bisedën" : "Hap mbështetjen (tërhiqe për ta zhvendosur)"}
        title="Tërhiqe për ta zhvendosur"
        className="relative flex items-center justify-center rounded-full bg-gold text-ink shadow-lift active:scale-95"
        style={{ width: BTN, height: BTN, touchAction: "none", cursor: "grab" }}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
        {!open && (
          <span
            className={`absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-gray-400"}`}
            aria-hidden="true"
          />
        )}
      </button>

      </div>

      {open && (
        <div
          className="fixed z-[81] flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift"
          style={{
            left: panelBox.left,
            top: panelBox.top,
            width: panelBox.w,
            height: panelBox.h,
          }}
        >
          <header className="border-b border-line bg-cream px-5 py-4">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-green-500" : "bg-gray-400"}`} />
              <p className="text-sm font-extrabold text-ink">
                {online ? "Mbështetja është online" : "Jemi jashtë orarit"}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              {status ? status.nextOpenLabel : HOURS_LABEL}
              {status && ` · ora ${status.localTime}`}
            </p>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-cream p-4 text-sm leading-relaxed text-muted">
                {online
                  ? "Përshëndetje! Si mund të ndihmojmë?"
                  : `Ekipi ynë punon ${HOURS_LABEL}. Lëri mesazhin dhe përgjigjemi sapo kthehemi.`}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.fromAgent ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.fromAgent ? "rounded-bl-md bg-cream text-ink" : "rounded-br-md bg-gold text-ink"}`}>
                  {m.body}
                  <span className="mt-1 block text-[11px] text-ink/50">{m.time}</span>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && <p className="px-4 pb-2 text-xs font-semibold text-red-500">{error}</p>}

          <div className="border-t border-line p-3">
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Shkruaj mesazhin…"
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm outline-none focus:border-gold"
              />
              <button
                onClick={send}
                disabled={sending || !text.trim()}
                aria-label="Dërgo"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-ink hover:bg-gold-dark disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
