"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Heart, MapPin } from "lucide-react";
import { Avatar, Stars } from "./Brand";
import type { Professional } from "@/lib/data";

export default function ProCard({ pro }: { pro: Professional }) {
  const [fav, setFav] = useState(false);

  return (
    <article className="group relative flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
      <button
        type="button"
        onClick={() => setFav((v) => !v)}
        aria-pressed={fav}
        aria-label={fav ? "Hiq nga të preferuarat" : "Shto te të preferuarat"}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted transition-colors hover:border-gold hover:text-gold-dark"
      >
        <Heart
          size={16}
          className={fav ? "fill-gold text-gold" : ""}
          strokeWidth={2}
        />
      </button>

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar initials={pro.initials} hue={pro.hue} size={72} />
          {pro.verified && (
            <span
              className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5"
              title="I verifikuar"
            >
              <BadgeCheck size={20} className="fill-gold text-white" />
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-bold text-ink">{pro.name}</h3>
        <p className="text-sm text-muted">{pro.profession}</p>

        <div className="mt-2 flex items-center gap-1.5">
          <Stars rating={pro.rating} />
          <span className="text-sm font-bold text-ink">{pro.rating}</span>
          <span className="text-sm text-muted">({pro.reviews})</span>
        </div>

        <p className="mt-1.5 flex items-center gap-1 text-sm text-muted">
          <MapPin size={13} aria-hidden="true" />
          {pro.city}
        </p>
      </div>

      <Link
        href={`/profesionisti/${pro.id}`}
        className="mt-5 rounded-full border border-gold px-5 py-2.5 text-center text-sm font-semibold text-gold-dark transition-colors hover:bg-gold hover:text-ink"
      >
        Shiko profilin
      </Link>
    </article>
  );
}
