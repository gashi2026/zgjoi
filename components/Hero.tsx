import Link from "next/link";
import SearchBar from "./SearchBar";
import { Bee, FlightPath } from "./Brand";
import Honeycomb from "./Honeycomb";
import { popularSearches } from "@/lib/data";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Left: copy + search — sits above the comb's tail */}
        <div className="relative z-10 animate-fade-up">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
            Gjej profesionist për
            <br />
            çdo shërbim. <span className="text-gold">Lehtë.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Zgjoi është platforma më e besuar në Kosovë për të gjetur dhe
            punësuar profesionistë lokalë.
          </p>

          <div className="mt-8 max-w-xl">
            <SearchBar />
          </div>

          <div className="mt-5 flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="shrink-0 text-sm font-bold text-ink">Popullore:</span>
            {popularSearches.slice(0, 6).map((s) => (
              <Link
                key={s}
                href={`/kerko?q=${encodeURIComponent(s)}`}
                className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm text-muted transition-colors hover:border-gold hover:text-gold-dark"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: the comb. Anchored bottom-right and wider than its
            column, so its lower tail slides in under the search bar and
            the band climbs away toward the top right. */}
        <div className="relative hidden min-h-[560px] sm:block">
          <div className="absolute -right-8 bottom-0 z-0 lg:-right-10">
            <Honeycomb />
            {/* a bee setting off from beside the search bar, up into the comb */}
            <div className="pointer-events-none absolute -bottom-2 -left-10 z-20">
              <Bee size={44} className="animate-bee-hover" />
              <FlightPath className="absolute -top-8 left-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
