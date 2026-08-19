import SearchBar from "./SearchBar";
import { Bee, FlightPath } from "./Brand";
import Honeycomb from "./Honeycomb";
import MobileHexBelt from "./MobileHexBelt";
import { db } from "@/lib/server/db";
import { getHoneycombMap, getSiteSettings } from "@/lib/server/settings";
import { categories as baseCategories } from "@/lib/data";

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
      db.category.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    ]);
    if (site?.heroTitle) title = site.heroTitle;
    if (site?.heroAccent) accent = site.heroAccent;
    if (site?.heroSubtitle) subtitle = site.heroSubtitle;
    if (comb && Object.keys(comb).length > 0) services = comb;
    if (cats.length > 0) catalog = cats.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }));
  } catch {
    /* fall back to defaults */
  }

  const beltCats =
    catalog ?? baseCategories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }));

  const [line1, line2] = title.includes("\n") ? title.split("\n") : [title, ""];

  return (
    <section className="relative overflow-hidden bg-cream">
      {/* Phones keep the phone layout no matter how far you zoom out —
          the switch follows the device, not the window width. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .zg-touch { display: none; }
            .zg-pointer { display: block; }

            /* touch devices keep the phone layout at any zoom level */
            @media (max-width: 640px), (hover: none) and (pointer: coarse) {
              .zg-touch { display: block; }
              .zg-pointer { display: none; }
              .zg-hero-grid { grid-template-columns: 1fr !important; }
              .zg-hero-grid { padding-top: 1.75rem; padding-bottom: 1.5rem; }
            }

            /* phone held sideways: put the copy and the belt side by side,
               and tighten everything so it still fits the short screen */
            @media (hover: none) and (pointer: coarse) and (orientation: landscape) {
              .zg-hero-grid {
                grid-template-columns: 1fr 1fr !important;
                align-items: center;
                gap: 1.25rem !important;
                padding-top: 1rem;
                padding-bottom: 1rem;
              }
              .zg-hero-copy h1 { font-size: 1.6rem; line-height: 1.12; }
              .zg-hero-copy p { font-size: 0.9rem; margin-top: 0.6rem; }
              .zg-hero-search { margin-top: 0.9rem; }
              .zg-touch { margin-top: 0 !important; }
            }
          `,
        }}
      />

      <div className="zg-hero-grid mx-auto grid max-w-7xl items-center gap-8 px-4 pb-10 pt-10 sm:gap-12 sm:px-6 sm:pb-16 sm:pt-12 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="zg-hero-copy relative z-10 animate-fade-up">
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

          <div className="zg-hero-search mt-6 max-w-xl sm:mt-8">
            <SearchBar />
          </div>

          {/* touch devices: the hex belt, tucked under the search box */}
          <div className="zg-touch -mt-3">
            <MobileHexBelt cats={beltCats} />
          </div>
        </div>

        {/* pointer devices: the full comb on the right */}
        <div className="zg-pointer relative min-h-[520px]">
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
