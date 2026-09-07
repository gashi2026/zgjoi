"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "textarea"
    | "select"
    | "checkbox"
    | "number"
    | "datetime-local";
  value?: string | number;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  step?: string;
  options?: { value: string; label: string }[];
  hint?: string;
  as?: "number" | "list";
  autoComplete?: string;
};
export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 py-3 font-semibold text-ink hover:bg-gold-dark disabled:cursor-wait disabled:opacity-60";

export default function ApiForm({
  endpoint,
  fields = [],
  values = {},
  label = "Ruaj",
  successHref,
  confirmation,
  fragmentToken = false,
  idempotent = false,
}: {
  endpoint: string;
  fields?: Field[];
  values?: Record<string, unknown>;
  label?: string;
  successHref?: string;
  confirmation?: string;
  fragmentToken?: boolean;
  idempotent?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const key = useRef<string | null>(null);
  const inFlight = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || (confirmation && !window.confirm(confirmation)))
      return;
    inFlight.current = true;
    setPending(true);
    setMessage("");
    setErrors({});
    setSuccess(false);
    const data = new FormData(event.currentTarget);
    try {
      const body: Record<string, unknown> = { ...values };
      for (const field of fields) {
        const raw = String(data.get(field.name) ?? "");
        if (!raw && !field.required && field.type !== "checkbox") continue;
        body[field.name] =
          field.type === "checkbox"
            ? data.has(field.name)
            : field.as === "number"
              ? Number(raw)
              : field.type === "datetime-local"
                ? new Date(raw).toISOString()
                : field.as === "list"
                  ? raw
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : raw;
      }
      if (fragmentToken)
        body.token =
          new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      if (idempotent) {
        key.current ??= crypto.randomUUID();
        body.clientKey = key.current;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        setErrors(result.errors ?? {});
        throw new Error(
          result.message ||
            result.error ||
            "Veprimi nuk u krye. Provoni përsëri.",
        );
      }
      key.current = null;
      setSuccess(true);
      setMessage(result.message || "Veprimi u krye me sukses.");
      if (fragmentToken) history.replaceState(null, "", location.pathname);
      if (typeof result.url === "string") {
        const target = new URL(result.url);
        if (
          target.protocol !== "https:" ||
          target.hostname !== "checkout.stripe.com"
        )
          throw new Error("Adresa e pagesës nuk është e vlefshme.");
        window.location.assign(target.href);
        return;
      }
      const destination = successHref ?? result.redirect;
      if (
        typeof destination === "string" &&
        destination.startsWith("/") &&
        !destination.startsWith("//")
      )
        router.push(destination);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Lidhja dështoi. Formulari juaj është ruajtur këtu; provoni përsëri.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
      {fields.map((field) => (
        <label
          key={field.name}
          className="block text-sm font-semibold text-ink"
        >
          <span>
            {field.label}
            {field.required ? " *" : ""}
          </span>
          {field.type === "textarea" ? (
            <textarea
              name={field.name}
              defaultValue={field.value}
              required={field.required}
              minLength={field.minLength}
              maxLength={field.maxLength ?? 4000}
              rows={4}
              className={`${inputClass} mt-1`}
              aria-invalid={Boolean(errors[field.name])}
            />
          ) : field.type === "select" ? (
            <select
              name={field.name}
              defaultValue={field.value ?? ""}
              required={field.required}
              className={`${inputClass} mt-1`}
              aria-invalid={Boolean(errors[field.name])}
            >
              <option value="">Zgjidhni</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              defaultValue={field.type === "checkbox" ? undefined : field.value}
              required={field.required}
              min={field.min}
              max={field.max}
              minLength={field.minLength}
              maxLength={
                field.maxLength ?? (field.type === "password" ? 256 : 254)
              }
              step={field.step}
              autoComplete={field.autoComplete}
              className={
                field.type === "checkbox"
                  ? "ml-3 h-5 w-5 align-middle accent-gold"
                  : `${inputClass} mt-1`
              }
              aria-invalid={Boolean(errors[field.name])}
            />
          )}
          {field.hint && (
            <span className="mt-1 block text-xs font-normal text-muted">
              {field.hint}
            </span>
          )}
          {errors[field.name]?.map((error, i) => (
            <span key={i} className="mt-1 block text-sm text-red-700">
              {error}
            </span>
          ))}
        </label>
      ))}
      {message && (
        <p
          role={success ? "status" : "alert"}
          className={`rounded-xl p-3 text-sm ${success ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}
        >
          {message}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Duke përpunuar…" : label}
      </button>
    </form>
  );
}
