"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import type { Professional } from "@/lib/data";

type Errors = Partial<Record<"name" | "phone" | "message", string>>;

export default function QuoteModal({
  pro,
  open,
  onClose,
}: {
  pro: Professional;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function validate(): boolean {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Shkruani emrin tuaj.";
    if (!/^\+?[0-9\s]{8,15}$/.test(phone.trim()))
      next.phone = "Shkruani një numër telefoni të vlefshëm.";
    if (message.trim().length < 10)
      next.message = "Përshkruani punën me të paktën 10 karaktere.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    // Simulated request — replace with an API call when a backend exists
    window.setTimeout(() => setStatus("sent"), 900);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Kërko ofertë nga ${pro.name}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-label="Mbyll"
        tabIndex={-1}
      />

      <div className="relative z-10 w-full max-w-lg animate-fade-up rounded-t-3xl bg-white p-6 shadow-lift sm:m-4 sm:rounded-3xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-cream hover:text-ink"
          aria-label="Mbyll dritaren"
        >
          <X size={20} />
        </button>

        {status === "sent" ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 size={52} className="text-gold" />
            <h2 className="mt-4 text-xl font-extrabold text-ink">
              Kërkesa u dërgua!
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted">
              {pro.name} do t&apos;ju kontaktojë së shpejti me një ofertë për
              punën tuaj.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-gold px-7 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark"
            >
              Në rregull
            </button>
          </div>
        ) : (
          <>
            <h2 className="pr-10 text-xl font-extrabold text-ink">
              Kërko ofertë nga {pro.name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Përshkruani punën dhe merrni një ofertë pa pagesë.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="q-name" className="text-sm font-semibold text-ink">
                  Emri juaj
                </label>
                <input
                  id="q-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`mt-1.5 w-full rounded-xl border bg-cream px-4 py-3 text-sm outline-none transition-colors focus:border-gold ${
                    errors.name ? "border-red-400" : "border-line"
                  }`}
                  placeholder="p.sh. Artan Berisha"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="q-phone" className="text-sm font-semibold text-ink">
                  Numri i telefonit
                </label>
                <input
                  id="q-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`mt-1.5 w-full rounded-xl border bg-cream px-4 py-3 text-sm outline-none transition-colors focus:border-gold ${
                    errors.phone ? "border-red-400" : "border-line"
                  }`}
                  placeholder="+383 44 000 000"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="q-msg" className="text-sm font-semibold text-ink">
                  Përshkrimi i punës
                </label>
                <textarea
                  id="q-msg"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`mt-1.5 w-full resize-none rounded-xl border bg-cream px-4 py-3 text-sm outline-none transition-colors focus:border-gold ${
                    errors.message ? "border-red-400" : "border-line"
                  }`}
                  placeholder="Çfarë duhet të bëhet, ku dhe kur?"
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark disabled:opacity-60"
              >
                {status === "sending" && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {status === "sending" ? "Duke dërguar..." : "Dërgo kërkesën"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
