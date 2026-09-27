import SearchBar from "./SearchBar";
import Honeycomb from "./Honeycomb";
import MobileHexBelt from "./MobileHexBelt";
import { categories } from "@/lib/data";

export type HeroProps = {
  title: string;
  accent: string;
  subtitle: string;
  services?: Record<string, string>;
  catalog?: { slug: string; name: string; icon: string }[];
};

export default function HeroView({ title, accent, subtitle, services, catalog }: HeroProps) {
  return (
    <section className="relative bg-cream" aria-label="Gjeni profesionistin tuaj">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-9 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:px-8 xl:gap-12">
        <div className="relative z-20 min-w-0">
          <h1 className="whitespace-pre-line text-[clamp(2.125rem,3.6vw,3.4rem)] font-extrabold leading-[1.13] tracking-tight text-ink">
            {title}{" "}<span className="text-gold-dark">{accent}</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">{subtitle}</p>
          <div className="mt-7 max-w-xl"><SearchBar /></div>
        </div>
        <div className="min-w-0 lg:hidden">
          <MobileHexBelt cats={catalog ?? categories} />
        </div>
        <div className="hidden min-w-0 py-4 lg:block">
          <Honeycomb services={services} catalog={catalog} />
        </div>
      </div>
    </section>
  );
}
