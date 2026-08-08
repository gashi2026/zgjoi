"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type Msg = { id: string; body: string; fromAgent: boolean; time: string };
type Status = { online: boolean; localTime: string; nextOpenLabel: string };

const STORAGE_KEY = "zgjoi_support_ticket";
const HOURS_LABEL = "E hënë–e premte, 09:00–17:00 (koha e Kosovës)";

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      {/* launcher button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Mbyll bisedën" : "Hap mbështetjen"}
        className="fixed bottom-24 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink shadow-lift transition-transform hover:scale-105 lg:bottom-6"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
        {!open && (
          <span
            className={`absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-gray-400"}`}
            aria-hidden="true"
          />
        )}
      </button>

      {/* chat panel */}
      {open && (
        <div className="fixed bottom-40 right-5 z-[80] flex h-[min(520px,70vh)] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift lg:bottom-24">
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
