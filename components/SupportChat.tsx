"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type Msg = { id: string; body: string; fromAgent: boolean; time: string };
type Status = { online: boolean; localTime: string; nextOpenLabel: string };
type Pos = { x: number; y: number };

const STORAGE_KEY = "zgjoi_support_ticket";
const POS_KEY = "zgjoi_support_pos";
const HOURS_LABEL = "E hënë–e premte, 09:00–17:00";

const BTN = 56;      // launcher size
const MARGIN = 12;   // keep it off the very edge

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  /* ---------------------------------------------- draggable launcher */
  const [pos, setPos] = useState<Pos | null>(null);
  const dragging = useRef(false);
  const moved = useRef(0);
  const grab = useRef<Pos>({ x: 0, y: 0 });

  const clamp = useCallback((p: Pos): Pos => {
    const maxX = window.innerWidth - BTN - MARGIN;
    const maxY = window.innerHeight - BTN - MARGIN;
    return {
      x: Math.max(MARGIN, Math.min(maxX, p.x)),
      y: Math.max(MARGIN, Math.min(maxY, p.y)),
    };
  }, []);

  useEffect(() => {
    const fallback = (): Pos => ({
      x: window.innerWidth - BTN - 20,
      y: window.innerHeight - BTN - (window.innerWidth < 1024 ? 96 : 24),
    });
    let start = fallback();
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const p = JSON.parse(saved) as Pos;
        if (typeof p.x === "number" && typeof p.y === "number") start = p;
      }
    } catch { /* private mode */ }
    setPos(clamp(start));

    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!pos) return;
    dragging.current = true;
    moved.current = 0;
    grab.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    moved.current += Math.abs(e.movementX) + Math.abs(e.movementY);
    setPos(clamp({ x: e.clientX - grab.current.x, y: e.clientY - grab.current.y }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pos) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    }
    // a real drag shouldn't also open the chat
    if (moved.current < 6) setOpen((o) => !o);
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
  if (!pos) return null; // wait until we know where it lives

  /* open the panel on whichever side there's room */
  const panelAbove = pos.y > 300;
  const panelLeft = pos.x < 380;

  return (
    <div className="fixed z-[80]" style={{ left: pos.x, top: pos.y }}>
      {/* launcher — drag it anywhere, tap to open */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={open ? "Mbyll bisedën" : "Hap mbështetjen (mbaje shtypur për ta zhvendosur)"}
        title="Mbaje shtypur për ta zhvendosur"
        className="flex items-center justify-center rounded-full bg-gold text-ink shadow-lift transition-transform active:scale-95"
        style={{ width: BTN, height: BTN, touchAction: "none", cursor: dragging.current ? "grabbing" : "grab" }}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
        {!open && (
          <span
            className={`absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-gray-400"}`}
            aria-hidden="true"
          />
        )}
      </button>

      {/* chat panel, anchored to the launcher wherever it sits */}
      {open && (
        <div
          className="absolute flex h-[min(520px,60vh)] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift"
          style={{
            [panelAbove ? "bottom" : "top"]: BTN + 12,
            [panelLeft ? "left" : "right"]: 0,
          } as React.CSSProperties}
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
    </div>
  );
}
