import { Stars } from "./Brand";
import Marquee from "./Marquee";
import HexTile from "./HexTile";
import { testimonials } from "@/lib/data";

const TILE = 200;

export default function Testimonials() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Çfarë thonë klientët tanë
        </h2>
      </div>

      <div className="mt-6 pb-14">
        <Marquee speed={22} gap={0} className="py-6">
          {testimonials.map((t) => (
            <HexTile key={t.name + t.city} width={TILE}>
              <span className="text-xl font-extrabold leading-none text-gold">
                &ldquo;
              </span>
              <blockquote className="mt-1 text-[11.5px] leading-snug text-ink">
                {t.quote}
              </blockquote>
              <span className="mt-2 text-[12px] font-bold text-ink">
                {t.name}
              </span>
              <span className="text-[10.5px] text-muted">{t.city}</span>
              <span className="mt-1">
                <Stars rating={5} />
              </span>
            </HexTile>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
