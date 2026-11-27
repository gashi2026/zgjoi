import Link from "@/components/i18n/Link";
import { ArrowRight } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import Marquee from "../Marquee";
import HexTile from "../HexTile";
import { categories } from "@/lib/homepage-reference-data";
import { getT } from "@/lib/i18n/server";

const TILE = 190;

export default async function Categories() {
  const t = await getT();
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {t("categories.topCategories")}</h2>
          <Link
            href="/kategorite"
            className="group flex items-center gap-1 text-sm font-semibold text-gold-dark"
          >
            {t("categories.seeAll")}<ArrowRight
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
              label={t("categories.seePros", { name: c.name })}
            >
              <CategoryIcon
                name={c.icon}
                size={26}
                className="text-gold-dark"
                strokeWidth={1.8}
              />
              <span className="mt-2 text-[13px] font-bold leading-tight text-ink">
                {t.tx(c.name)}
              </span>
              <span className="mt-1 text-[11px] text-muted">
                {t("categories.seePros2")}</span>
            </HexTile>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
