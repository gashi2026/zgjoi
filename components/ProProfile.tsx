"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  ChevronLeft,
  Heart,
  MapPin,
  MessageCircle,
  Image as ImageIcon,
} from "lucide-react";
import { Avatar, Stars } from "./Brand";
import QuoteModal from "./QuoteModal";
import type { Professional, Review } from "@/lib/data";

const availabilityLabel: Record<Professional["available"], string> = {
  sot: "I lirë sot",
  neser: "I lirë nesër",
  "kete-jave": "I lirë këtë javë",
};

/* SVG portfolio placeholder tiles in warm tones */
function PortfolioTile({ index, hue }: { index: number; hue: number }) {
  const h = (hue + index * 24) % 360;
  return (
    <div
      className="flex aspect-[4/3] items-center justify-center rounded-xl border border-line"
      style={{
        background: `linear-gradient(135deg, hsl(${h} 65% 94%), hsl(${h} 55% 88%))`,
      }}
      role="img"
      aria-label={`Foto pune ${index + 1}`}
    >
      <ImageIcon size={26} style={{ color: `hsl(${h} 35% 55%)` }} />
    </div>
  );
}

export default function ProProfile({
  pro,
  reviews,
}: {
  pro: Professional;
  reviews: Review[];
}) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [fav, setFav] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/kerko"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-gold-dark"
        >
          <ChevronLeft size={16} />
          Kthehu te kërkimi
        </Link>

        {/* Header card */}
        <div className="relative mt-4 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative shrink-0 self-center sm:self-start">
              <Avatar initials={pro.initials} hue={pro.hue} size={104} />
              {pro.verified && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-1" title="I verifikuar">
                  <BadgeCheck size={26} className="fill-gold text-white" />
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink">
                  {pro.name}
                </h1>
                {pro.verified && (
                  <span className="rounded-full bg-honey px-3 py-1 text-xs font-bold text-gold-dark">
                    I verifikuar
                  </span>
                )}
              </div>
              <p className="mt-1 text-base text-muted">{pro.profession}</p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <Stars rating={pro.rating} />
                  <span className="font-bold text-ink">{pro.rating}</span>
                  <span className="text-muted">({pro.reviews} vlerësime)</span>
                </span>
                <span className="flex items-center gap-1 text-muted">
                  <MapPin size={14} />
                  {pro.city}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 font-semibold text-ink">
                  <CalendarClock size={14} className="text-gold-dark" />
                  {availabilityLabel[pro.available]}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFav((v) => !v)}
              aria-pressed={fav}
              aria-label={fav ? "Hiq nga të preferuarat" : "Shto te të preferuarat"}
              className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center self-start rounded-full border border-line bg-white text-muted transition-colors hover:border-gold hover:text-gold-dark sm:static"
            >
              <Heart size={18} className={fav ? "fill-gold text-gold" : ""} />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              className="flex-1 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink transition-all hover:bg-gold-dark hover:shadow-lift"
            >
              Kërko ofertë
            </button>
            <button
              type="button"
              onClick={() => setMessageSent(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gold px-6 py-3.5 text-sm font-semibold text-gold-dark transition-colors hover:bg-honey"
            >
              <MessageCircle size={16} />
              {messageSent ? "Mesazhi kërkon llogari — hyni së pari" : "Dërgo mesazh"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            <section className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-7">
              <h2 className="text-lg font-extrabold text-ink">Rreth meje</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{pro.about}</p>
            </section>

            {/* Portfolio */}
            <section className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-7">
              <h2 className="text-lg font-extrabold text-ink">Punët e mia</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PortfolioTile key={i} index={i} hue={pro.hue} />
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-7">
              <h2 className="text-lg font-extrabold text-ink">
                Vlerësimet ({pro.reviews})
              </h2>
              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Ende nuk ka komente të shkruara për këtë profesionist. Bëhu i
                  pari — punëso dhe lër vlerësimin tënd!
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {reviews.map((r, i) => (
                    <li
                      key={i}
                      className="rounded-2xl border border-line bg-cream p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-ink">
                          {r.author}{" "}
                          <span className="font-normal text-muted">· {r.city}</span>
                        </p>
                        <Stars rating={r.rating} />
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-ink">
                        {r.text}
                      </p>
                      <p className="mt-2 text-xs text-muted">{r.date}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 self-start">
            <section className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <h2 className="text-lg font-extrabold text-ink">
                Shërbimet dhe çmimet
              </h2>
              <ul className="mt-4 divide-y divide-line">
                {pro.services.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <span className="text-ink">{s.name}</span>
                    <span className="shrink-0 font-bold text-ink">
                      nga {s.price} €
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-xl bg-honey px-4 py-3 text-xs leading-relaxed text-ink/70">
                Çmimet janë fillestare. Kërkoni ofertë për një çmim të saktë
                sipas punës suaj.
              </p>
            </section>

            <section className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <h2 className="text-lg font-extrabold text-ink">Disponueshmëria</h2>
              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold">
                {["H", "M", "M", "E", "P", "Sh", "D"].map((d, i) => {
                  const busy = i === 2 || i === 6;
                  return (
                    <span
                      key={i}
                      className={`rounded-lg py-2 ${
                        busy ? "bg-cream text-muted line-through" : "bg-honey text-ink"
                      }`}
                      title={busy ? "I zënë" : "I lirë"}
                    >
                      {d}
                    </span>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted">
                E verdhë = ditë e lirë për punë të reja.
              </p>
            </section>
          </aside>
        </div>
      </div>

      <QuoteModal pro={pro} open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </div>
  );
}
