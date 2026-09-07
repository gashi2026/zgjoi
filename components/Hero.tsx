import { db } from "@/lib/server/db";
import { getHoneycombMap, getSiteSettings } from "@/lib/server/settings";
import HeroView from "./HeroView";

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

  return <HeroView title={title} accent={accent} subtitle={subtitle} services={services} catalog={catalog} />;
}
