import { Stars } from "./Brand";
import Marquee from "./Marquee";
import { testimonials } from "@/lib/data";

export default function Testimonials() {
  return (
    <section className="bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Çfarë thonë klientët tanë
        </h2>
      </div>

      <div className="mt-8 pb-16">
        <Marquee speed={24} gap={16} className="py-2">
          {testimonials.map((t) => (
            <div
              key={t.name + t.city}
              className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-line bg-cream p-5 shadow-soft"
            >
              <span className="text-2xl font-extrabold leading-none text-gold">&ldquo;</span>
              <blockquote className="text-sm leading-relaxed text-ink">{t.quote}</blockquote>
              <div className="mt-auto flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">{t.name}</p>
                  <p className="text-xs text-muted">{t.city}</p>
                </div>
                <Stars rating={5} />
              </div>
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
