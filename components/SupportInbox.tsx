"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Inbox, Send } from "lucide-react";

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

const stateChip: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Hapur", cls: "bg-honey text-gold-dark" },
  WAITING: { label: "Në pritje", cls: "bg-orange-50 text-orange-600" },
  RESOLVED: { label: "Zgjidhur", cls: "bg-green-50 text-green-600" },
};

export default function SupportInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "WAITING" | "RESOLVED">("ALL");

  async function loadTickets() {
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
  }

  useEffect(() => {
    loadTickets();
    const t = setInterval(loadTickets, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function setState(state: "OPEN" | "WAITING" | "RESOLVED") {
    if (!active) return;
    // instant visual feedback
    setTickets((ts) => ts.map((t) => (t.id === active ? { ...t, state } : t)));
    await fetch("/api/support/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: active, state }),
    });
    loadTickets();
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

  const activeTicket = tickets.find((t) => t.id === active);
  const activeState = activeTicket?.state ?? "OPEN";
  const visible = filter === "ALL" ? tickets : tickets.filter((t) => t.state === filter);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* ticket list */}
      <div className="rounded-2xl border border-line bg-white shadow-soft">
        <div className="flex gap-1 border-b border-line p-2">
          {([["ALL", "Të gjitha"], ["OPEN", "Hapur"], ["WAITING", "Pritje"], ["RESOLVED", "Zgjidhur"]] as const).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-bold transition-colors ${
                filter === k ? "bg-gold text-ink" : "text-muted hover:bg-cream"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <ul>
          {visible.map((t) => {
            const chip = stateChip[t.state] ?? stateChip.OPEN;
            return (
              <li key={t.id}>
                <button
                  onClick={() => setActive(t.id)}
                  className={`w-full border-b border-line px-4 py-4 text-left last:border-0 ${
                    active === t.id ? "bg-honey" : "hover:bg-cream"
                  } ${t.state === "RESOLVED" ? "opacity-60" : ""}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <b className="truncate text-sm text-ink">{t.who}</b>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.cls}`}>
                      {chip.label}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted">{t.subject}</span>
                  <span className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    {t.updatedAt}
                    {t.offline && (
                      <span className="rounded-full bg-[#F3F1EE] px-2 py-0.5 text-[10px] font-bold text-muted">
                        offline
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="p-6 text-center text-xs text-muted">Asnjë bisedë në këtë filtër.</li>
          )}
        </ul>
      </div>

      {/* conversation */}
      <div className="flex min-h-[460px] flex-col rounded-2xl border border-line bg-white shadow-soft">
        {/* state controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <p className="text-sm font-bold text-ink">{activeTicket?.who ?? "Biseda"}</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setState("OPEN")}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeState === "OPEN"
                  ? "border-gold bg-honey text-gold-dark"
                  : "border-line text-muted hover:border-gold hover:text-gold-dark"
              }`}
            >
              <Inbox size={12} /> Hapur
            </button>
            <button
              onClick={() => setState("WAITING")}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeState === "WAITING"
                  ? "border-orange-300 bg-orange-50 text-orange-600"
                  : "border-line text-muted hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              <Clock3 size={12} /> Në pritje
            </button>
            <button
              onClick={() => setState("RESOLVED")}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeState === "RESOLVED"
                  ? "border-green-300 bg-green-50 text-green-600"
                  : "border-line text-muted hover:border-green-300 hover:text-green-600"
              }`}
            >
              <CheckCircle2 size={12} /> Zgjidhur
            </button>
          </div>
        </div>

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
