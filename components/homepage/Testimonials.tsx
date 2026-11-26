import Marquee from "../Marquee";
import HexTile from "../HexTile";
import CategoryIcon from "./CategoryIcon";
import { betaPromises } from "@/lib/homepage-reference-data";

const TILE = 200;

/* Beta: no invented customer quotes. The honeycomb belt shows what Zgjoi
   actually guarantees until real, verified reviews exist. */
export default function Testimonials() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Çfarë ju premtojmë gjatë beta-s
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
          Vlerësimet e klientëve do të shfaqen këtu vetëm pasi të ketë punë të
          përfunduara dhe të konfirmuara.
        </p>
      </div>

      <div className="mt-6 pb-14">
        <Marquee speed={22} gap={0} className="py-6">
          {betaPromises.map((promise) => (
            <HexTile key={promise.title} width={TILE}>
              <span className="text-gold-dark">
                <CategoryIcon name={promise.icon} size={22} />
              </span>
              <span className="mt-1 text-[12.5px] font-extrabold leading-tight text-ink">
                {promise.title}
              </span>
              <span className="mt-1 text-[11px] leading-snug text-muted">
                {promise.text}
              </span>
            </HexTile>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
