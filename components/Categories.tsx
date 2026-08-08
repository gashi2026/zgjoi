import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import Marquee from "./Marquee";
import HexTile from "./HexTile";
import { categories } from "@/lib/data";

const TILE = 190;

export default function Categories() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Kategoritë kryesore
          </h2>
          <Link
            href="/kategorite"
            className="group flex items-center gap-1 text-sm font-semibold text-gold-dark"
          >
            Shiko të gjitha
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>

      {/* honeycomb belt: scrolls forever, pauses on hover, draggable */}
      <div className="mt-6 pb-14">
        <Marquee speed={38} gap={0} className="py-6">
          {categories.map((c) => (
            <HexTile
              key={c.slug}
              width={TILE}
              href={`/kerko?kategoria=${c.slug}`}
              label={`${c.name} — shiko profesionistët`}
            >
              <CategoryIcon
                name={c.icon}
                size={26}
                className="text-gold-dark"
                strokeWidth={1.8}
              />
              <span className="mt-2 text-[13px] font-bold leading-tight text-ink">
                {c.name}
              </span>
              <span className="mt-1 text-[11px] text-muted">
                {c.count} profesionistë
              </span>
            </HexTile>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
