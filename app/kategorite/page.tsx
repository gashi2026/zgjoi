import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import { categories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Kategoritë — Zgjoi",
  description: "Shfleto të gjitha kategoritë e shërbimeve në Zgjoi.",
};

export default function KategoritePage() {
  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Të gjitha kategoritë
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted">
          Zgjidhni kategorinë e shërbimit dhe gjeni profesionistët më të
          vlerësuar në qytetin tuaj.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/kerko?kategoria=${c.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:border-gold hover:shadow-lift"
            >
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 112" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <path
                    d="M50 4 L91 28 L91 84 L50 108 L9 84 L9 28 Z"
                    fill="#FFF3CF"
                    className="transition-colors group-hover:fill-[#FFE9A8]"
                  />
                </svg>
                <CategoryIcon name={c.icon} size={24} className="relative z-10 text-ink" />
              </span>
              <div className="flex-1">
                <h2 className="text-base font-bold text-ink">{c.name}</h2>
                <p className="text-sm text-muted">{c.count}+ profesionistë</p>
              </div>
              <ArrowRight
                size={18}
                className="text-line transition-all group-hover:translate-x-1 group-hover:text-gold-dark"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
