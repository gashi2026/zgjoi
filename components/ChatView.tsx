"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Paperclip, Send, ShieldCheck } from "lucide-react";
import { conversation, threads, type ChatMessage } from "@/lib/account";

export default function ChatView({ backHref }: { backHref: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(conversation);
  const [text, setText] = useState("");
  const active = threads[0];

  function send() {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [
      ...m,
      {
        id: `c-${m.length + 1}`,
        from: "une",
        text: t,
        time: new Date().toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setText("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* thread list */}
      <div className="rounded-2xl border border-line bg-white shadow-soft">
        <ul>
          {threads.map((t, i) => (
            <li
              key={t.id}
              className={`flex cursor-pointer items-center gap-3 border-b border-line px-4 py-4 last:border-0 ${
                i === 0 ? "bg-honey" : "hover:bg-cream"
              }`}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold text-xs font-extrabold"
                style={{ background: `hsl(${t.hue} 70% 94%)`, color: `hsl(${t.hue} 45% 32%)` }}
              >
                {t.initials}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm text-ink">{t.with}</b>
                <span className="block truncate text-xs text-muted">{t.last}</span>
              </span>
              {t.unread > 0 && (
                <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-extrabold text-ink">
                  {t.unread}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* conversation */}
      <div className="flex min-h-[520px] flex-col rounded-2xl border border-line bg-white shadow-soft">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Link href={backHref} className="text-muted lg:hidden">
            <ArrowLeft size={18} />
          </Link>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold text-xs font-extrabold"
            style={{ background: `hsl(${active.hue} 70% 94%)`, color: `hsl(${active.hue} 45% 32%)` }}
          >
            {active.initials}
          </span>
          <span>
            <b className="block text-sm text-ink">{active.with}</b>
            <span className="text-xs text-muted">{active.role}</span>
          </span>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === "une" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.from === "une"
                    ? "rounded-br-md bg-gold text-ink"
                    : "rounded-bl-md bg-cream text-ink"
                }`}
              >
                {m.text}
                <span className="mt-1 block text-[11px] text-ink/50">{m.time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line p-4">
          <p className="mb-3 flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-xs text-muted">
            <ShieldCheck size={14} className="shrink-0 text-gold-dark" />
            Mos ndani numra bankarë jashtë platformës — pagesat kryhen vetëm përmes Zgjoit.
          </p>
          <div className="flex items-center gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted hover:border-gold hover:text-gold-dark">
              <Paperclip size={17} />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Shkruaj mesazhin…"
              className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm outline-none focus:border-gold"
            />
            <button
              onClick={send}
              aria-label="Dërgo"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-ink transition-colors hover:bg-gold-dark"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
