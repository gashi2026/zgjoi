"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";

type Ticket = {
  id: string;
  who: string;
  subject: string;
  state: string;
  offline: boolean;
  updatedAt: string;
  unread: number;
};

type Msg = { id: string; body: string; fromAgent: boolean; time: string };

export default function SupportInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/support/tickets", { cache: "no-store" });
        const data = await res.json();
        setTickets(data.tickets ?? []);
        if (!active && data.tickets?.[0]) setActive(data.tickets[0].id);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const load = async () => {
      const res = await fetch(`/api/support/messages?ticketId=${active}`, { cache: "no-store" });
      const data = await res.json();
      setMessages(data.messages ?? []);
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [active]);

  async function reply() {
    const body = text.trim();
    if (!body || !active) return;
    setText("");
    await fetch("/api/support/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: active, body }),
    });
    const res = await fetch(`/api/support/messages?ticketId=${active}`, { cache: "no-store" });
    setMessages((await res.json()).messages ?? []);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">
        Duke ngarkuar bisedat…
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <p className="text-base font-bold text-ink">Asnjë bisedë e hapur</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Mesazhet nga widget-i i mbështetjes shfaqen këtu sapo të vijnë.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="rounded-2xl border border-line bg-white shadow-soft">
        <ul>
          {tickets.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setActive(t.id)}
                className={`w-full border-b border-line px-4 py-4 text-left last:border-0 ${
                  active === t.id ? "bg-honey" : "hover:bg-cream"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <b className="truncate text-sm text-ink">{t.who}</b>
                  {t.offline && (
                    <span className="shrink-0 rounded-full bg-[#F3F1EE] px-2 py-0.5 text-[10px] font-bold text-muted">
                      offline
                    </span>
                  )}
                </span>
                <span className="mt-1 block truncate text-xs text-muted">{t.subject}</span>
                <span className="mt-1 block text-[11px] text-muted">{t.updatedAt}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-[460px] flex-col rounded-2xl border border-line bg-white shadow-soft">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.fromAgent ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.fromAgent ? "rounded-br-md bg-gold text-ink" : "rounded-bl-md bg-cream text-ink"
                }`}
              >
                {m.body}
                <span className="mt-1 block text-[11px] text-ink/50">{m.time}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-line p-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reply()}
            placeholder="Përgjigju klientit…"
            className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <button
            onClick={reply}
            aria-label="Dërgo"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-ink hover:bg-gold-dark"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
