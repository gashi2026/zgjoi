"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { buttonClass, inputClass } from "./ApiForm";
type Message = {
  id: string;
  body: string;
  mine?: boolean;
  fromAgent?: boolean;
  time: string;
  createdAt: string;
};
export default function Thread({
  id: initialId,
  support = false,
  staff = false,
  closed = false,
}: {
  id?: string;
  support?: boolean;
  staff?: boolean;
  closed?: boolean;
}) {
  const [id, setId] = useState(initialId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(Boolean(initialId));
  const key = useRef<string | null>(null);
  const sendLock = useRef(false);
  const mounted = useRef(true);
  const identity = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!support || initialId) return;
    let active = true;
    fetch("/api/support/current", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Biseda nuk u hap. Provoni përsëri.");
        const data = await response.json();
        if (active) {
          identity.current = data.identity;
          setId(data.ticketId ?? undefined);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [support, initialId]);
  const load = useCallback(
    async (before?: string) => {
      if (!id) return;
      try {
        // A widget left open during account changes must erase the previous thread.
        if (support && !staff && !initialId) {
          const response = await fetch("/api/support/current", {
            cache: "no-store",
          });
          if (!response.ok) throw new Error("Biseda nuk është e disponueshme.");
          const data = await response.json();
          if (identity.current !== data.identity) {
            if (mounted.current) {
              setMessages([]);
              setBody("");
              setId(data.ticketId ?? undefined);
              identity.current = data.identity;
            }
            return;
          }
        }
        const params = new URLSearchParams({
          [support ? "ticketId" : "conversationId"]: id,
          ...(before ? { before } : {}),
        });
        const response = await fetch(
          `${support ? "/api/support/messages" : "/api/messages"}?${params}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) {
          if ([401, 403, 404].includes(response.status) && mounted.current)
            setMessages([]);
          throw new Error(data.message || "Biseda nuk u hap.");
        }
        if (!mounted.current) return;
        setMessages((previous) => {
          const merged = new Map(
            (before
              ? [...data.messages, ...previous]
              : [...previous, ...data.messages]
            ).map((m: Message) => [m.id, m]),
          );
          return [...merged.values()].sort(
            (a, b) =>
              a.createdAt.localeCompare(b.createdAt) ||
              a.id.localeCompare(b.id),
          );
        });
        if (before || messages.length <= 100) setHasMore(Boolean(data.hasMore));
        setError("");
      } catch (e) {
        if (mounted.current)
          setError(
            e instanceof Error
              ? e.message
              : "Lidhja dështoi. Po provojmë përsëri.",
          );
      }
    },
    [id, support, staff, initialId, messages.length],
  );
  useEffect(() => {
    const initial = setTimeout(() => {
      void load();
    }, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 6000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendLock.current || !body.trim()) return;
    sendLock.current = true;
    setPending(true);
    setError("");
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch(
        support
          ? staff
            ? "/api/support/reply"
            : "/api/support/send"
          : "/api/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [support ? "ticketId" : "conversationId"]: id,
            body,
            clientKey: key.current,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Mesazhi nuk u dërgua.");
      if (!mounted.current) return;
      setBody("");
      key.current = null;
      if (data.ticketId && data.ticketId !== id) setId(data.ticketId);
      else await load();
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Mesazhi nuk u dërgua. Teksti juaj mbetet këtu.",
        );
    } finally {
      sendLock.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return (
    <div className="space-y-3">
      {hasMore && (
        <button
          onClick={() => void load(messages[0]?.id)}
          className="min-h-11 text-sm text-gold-dark"
        >
          Ngarko mesazhe më të vjetra
        </button>
      )}
      <div
        role="log"
        aria-label="Mesazhet"
        aria-live="polite"
        className="max-h-96 space-y-3 overflow-y-auto rounded-xl bg-cream p-3"
      >
        {!messages.length && (
          <p className="text-sm text-muted">
            {ready ? "Nuk ka mesazhe ende." : "Duke hapur bisedën…"}
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[92%] rounded-xl p-3 ${support ? (m.fromAgent ? "bg-white" : "ml-auto bg-honey") : m.mine ? "ml-auto bg-honey" : "bg-white"}`}
          >
            <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
            <time className="mt-1 block text-xs text-muted">
              {support ? (m.fromAgent ? "Mbështetja · " : "") : ""}
              {m.time}
            </time>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {closed ? (
        <p className="text-sm text-muted">
          Biseda është mbyllur. Për ndihmë përdorni mbështetjen.
        </p>
      ) : (
        <form onSubmit={send} className="space-y-2">
          <label className="block text-sm font-semibold">
            Mesazhi
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                key.current = null;
              }}
              maxLength={2000}
              required
              rows={3}
              className={`${inputClass} mt-1`}
              disabled={pending || !ready}
            />
          </label>
          <button disabled={pending || !ready} className={buttonClass}>
            {pending ? "Duke dërguar…" : "Dërgo"}
          </button>
        </form>
      )}
    </div>
  );
}
