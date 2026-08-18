import SearchBar from "./SearchBar";
import { Bee, FlightPath } from "./Brand";
import Honeycomb from "./Honeycomb";
import HoneycombMobile from "./HoneycombMobile";
import { db } from "@/lib/server/db";
import { getHoneycombMap, getSiteSettings } from "@/lib/server/settings";

export default async function Hero() {
  let title = "Gjej profesionist për\nçdo shërbim.";
  let accent = "Lehtë.";
  let subtitle =
    "Zgjoi është platforma më e besuar në Kosovë për të gjetur dhe punësuar profesionistë lokalë.";
  let services: Record<string, string> | undefined;
  let catalog: { slug: string; name: string; icon: string }[] | undefined;

  try {
    const [site, comb, cats] = await Promise.all([
      getSiteSettings(),
      getHoneycombMap(),
      db.category.findMany({ where: { active: true } }),
    ]);
    if (site?.heroTitle) title = site.heroTitle;
    if (site?.heroAccent) accent = site.heroAccent;
    if (site?.heroSubtitle) subtitle = site.heroSubtitle;
    if (comb && Object.keys(comb).length > 0) services = comb;
    if (cats.length > 0) catalog = cats.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }));
  } catch {
    /* fall back to defaults */
  }

  const [line1, line2] = title.includes("\n") ? title.split("\n") : [title, ""];

  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-10 pt-10 sm:gap-12 sm:px-6 sm:pb-16 sm:pt-12 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Left: copy + search */}
        <div className="relative z-10 animate-fade-up">
          <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
            {line1}
            {line2 && (
              <>
                <br />
                {line2}
              </>
            )}{" "}
            <span className="text-gold">{accent}</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted sm:mt-5 sm:text-lg">
            {subtitle}
          </p>

          <div className="mt-6 max-w-xl sm:mt-8">
            <SearchBar />
          </div>

          {/* Phones: a compact vertical comb, right under the search box */}
          <div className="relative mt-8 sm:hidden">
            <HoneycombMobile services={services} catalog={catalog} />
            <div className="pointer-events-none absolute bottom-6 left-0">
              <Bee size={34} className="animate-bee-hover" />
              <FlightPath className="absolute -top-6 left-8 scale-75" />
            </div>
          </div>
        </div>

        {/* Tablet & desktop: the full comb on the right */}
        <div className="relative hidden min-h-[520px] sm:block">
          <div className="absolute bottom-0 right-0 z-0">
            <Honeycomb services={services} catalog={catalog} />
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
