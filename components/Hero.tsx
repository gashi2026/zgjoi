import SearchBar from "./SearchBar";
import { Bee, FlightPath } from "./Brand";
import Honeycomb from "./Honeycomb";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Left: copy + search — sits above the comb */}
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

        </div>

        {/* Right: the comb. It is anchored to the bottom right and is wider
            than its column, so its lower tail slides in under the search bar
            and the band climbs away to the top right. */}
        <div className="relative hidden min-h-[510px] sm:block">
          <div className="absolute bottom-0 right-0 z-0">
            <Honeycomb />
            {/* a bee setting off from beside the search bar, up into the comb */}
            <div className="pointer-events-none absolute -bottom-4 left-2 z-20">
              <Bee size={44} className="animate-bee-hover" />
              <FlightPath className="absolute -top-6 left-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
