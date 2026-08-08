import Link from "next/link";
import SearchBar from "./SearchBar";
import { Bee, FlightPath } from "./Brand";
import Honeycomb from "./Honeycomb";
import { popularSearches } from "@/lib/data";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Left: copy + search */}
        <div className="animate-fade-up">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
            Gjej profesionistin
            <br />
            e duhur. <span className="text-gold">Lehtë.</span>
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

        {/* Right: honeycomb composition — bottom-left to top-right */}
        <div className="relative mx-auto hidden w-full max-w-[560px] justify-center sm:flex">
          <div className="absolute -top-4 right-2 z-10">
            <FlightPath className="absolute -left-[120px] top-6 rotate-180" />
            <Bee size={50} className="animate-bee-hover" />
          </div>
          <Honeycomb />
        </div>
      </div>
    </section>
  );
}
