"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { Avatar } from "./Brand";
import { booking } from "@/lib/account";

const tags = [
  "Në kohë",
  "Punë e pastër",
  "Çmim i drejtë",
  "Komunikim i mirë",
  "Profesional",
  "Do ta rekomandoja",
];

export default function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  function submit() {
    const e: Record<string, string> = {};
    if (rating === 0) e.rating = "Zgjidh një vlerësim me yje.";
    if (text.trim().length < 15) e.text = "Shkruaj të paktën 15 karaktere.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setState("sending");
    setTimeout(() => setState("done"), 900);
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-gold bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-honey">
          <CheckCircle2 size={28} className="text-gold-dark" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-ink">Faleminderit për vlerësimin!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          Vlerësimi u publikua dhe pagesa u lirua te {booking.pro}. Kuponi yt me
          10% zbritje është shtuar në llogari.
        </p>
        <div className="mx-auto mt-5 w-fit rounded-xl border border-dashed border-gold bg-honey px-6 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Kuponi</p>
          <p className="text-lg font-extrabold text-ink">ZGJOI-10</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/llogaria" className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-ink hover:bg-gold-dark">
            Llogaria ime
          </Link>
          <Link href="/kerkesa-e-re" className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-gold">
            Kërkesë e re
          </Link>
        </div>
      </div>
    );
  }

  const words = ["", "Shumë e dobët", "E dobët", "Në rregull", "E mirë", "Shkëlqyeshëm"];

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-4 border-b border-line pb-6">
        <Avatar initials={booking.initials} hue={booking.hue} size={56} />
        <div>
          <p className="text-sm font-extrabold text-ink">{booking.pro}</p>
          <p className="text-xs text-muted">
            {booking.service} · {booking.date}
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm font-bold text-ink">Si ishte puna?</p>
        <div className="mt-3 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => {
                setRating(n);
                setErrors((e) => ({ ...e, rating: "" }));
              }}
              aria-label={`${n} yje`}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={38}
                className={
                  (hover || rating) >= n ? "fill-gold text-gold" : "text-line"
                }
              />
            </button>
          ))}
        </div>
        <p className="mt-2 h-5 text-sm font-semibold text-muted">
          {words[hover || rating]}
        </p>
        {errors.rating && (
          <p className="text-xs font-semibold text-[#B4232A]">{errors.rating}</p>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm font-bold text-ink">Çfarë shkoi mirë?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
              }
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                picked.includes(t)
                  ? "border-gold bg-honey text-ink"
                  : "border-line bg-white text-muted hover:border-gold hover:text-gold-dark"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-bold text-ink">Komenti yt</p>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Përshkruaj përvojën tënde që të ndihmosh klientët e tjerë."
          className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-gold"
        />
        {errors.text && (
          <p className="mt-1.5 text-xs font-semibold text-[#B4232A]">{errors.text}</p>
        )}
      </div>

      <p className="mt-5 rounded-xl bg-honey px-4 py-3 text-sm text-ink/80">
        Pas publikimit, pagesa prej {booking.price}€ lirohet te profesionisti dhe
        ti përfiton <b>10% zbritje</b> në punën e radhës.
      </p>

      <button
        onClick={submit}
        disabled={state === "sending"}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-ink transition-all hover:bg-gold-dark hover:shadow-lift disabled:opacity-70"
      >
        {state === "sending" && <Loader2 size={16} className="animate-spin" />}
        Publiko vlerësimin dhe liro pagesën
      </button>
    </div>
  );
}
