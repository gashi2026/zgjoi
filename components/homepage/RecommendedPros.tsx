import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Marquee from "../Marquee";
import HexTile from "../HexTile";
import CategoryIcon from "./CategoryIcon";
import { categories } from "@/lib/homepage-reference-data";

const TILE = 190;

/* Beta: no sample professionals with invented ratings. The belt invites real
   professionals to join in each approved category instead. */
export default function RecommendedPros() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Bëhu ndër profesionistët e parë
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Po pranojmë profesionistë në këto kategori. Profilet shqyrtohen
              para se të shfaqen te klientët.
            </p>
          </div>
          <Link
            href="/regjistrohu-profesionist"
            className="group flex items-center gap-1 text-sm font-semibold text-gold-dark"
          >
            Regjistrohu si profesionist
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>

      {/* belt runs the other way to the categories row */}
      <div className="mt-6 pb-14">
        <Marquee speed={30} direction="right" gap={0} className="py-6">
          {categories.map((category) => (
            <HexTile
              key={category.slug}
              width={TILE}
              href={`/kerko?kategoria=${category.slug}`}
              label={`${category.name} — kërko profesionistë`}
            >
              <span className="text-gold-dark">
                <CategoryIcon name={category.icon} size={26} />
              </span>
              <span className="mt-2 text-[13px] font-extrabold leading-tight text-ink">
                {category.name}
              </span>
              <span className="mt-1 text-[10.5px] text-muted">
                Po pranojmë profesionistë
              </span>
            </HexTile>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
