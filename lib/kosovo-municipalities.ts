import { z } from "zod";

/** The 38 official municipalities of Kosovo.
 * `name` is the Albanian form stored in User.city / ProProfile.serviceCities
 * (the existing columns). English labels are used under /en. */
export type KosovoMunicipality = {
  /** Stable id, used in tests and option keys. */
  id: string;
  /** Official Albanian name, stored in the database. */
  name: string;
  /** English label (British spelling). */
  en: string;
  /** Alternate spellings and older names, matched case-insensitively without diacritics. */
  aliases: readonly string[];
};

export const KOSOVO_MUNICIPALITIES = [
  { id: "decan", name: "Deçan", en: "Deçan", aliases: ["decani", "decan", "deçani"] },
  { id: "dragash", name: "Dragash", en: "Dragash", aliases: ["dragas"] },
  { id: "drenas", name: "Drenas", en: "Drenas", aliases: ["gllogoc", "glogoc", "glogovac", "drenas gllogoc"] },
  { id: "ferizaj", name: "Ferizaj", en: "Ferizaj", aliases: ["urosevac"] },
  { id: "fushe-kosove", name: "Fushë Kosovë", en: "Kosovo Polje", aliases: ["fushe kosove", "kosovo polje", "kosova polje"] },
  { id: "gjakove", name: "Gjakovë", en: "Gjakova", aliases: ["gjakova", "djakovica", "djakova"] },
  { id: "gjilan", name: "Gjilan", en: "Gjilan", aliases: ["gnjilane"] },
  { id: "gracanice", name: "Graçanicë", en: "Graçanica", aliases: ["gracanica", "gracanice"] },
  { id: "hani-i-elezit", name: "Hani i Elezit", en: "Elez Han", aliases: ["elez han", "hani elezit", "elet han"] },
  { id: "istog", name: "Istog", en: "Istog", aliases: ["istok"] },
  { id: "junik", name: "Junik", en: "Junik", aliases: [] },
  { id: "kacanik", name: "Kaçanik", en: "Kaçanik", aliases: ["kacanik"] },
  { id: "kamenice", name: "Kamenicë", en: "Kamenica", aliases: ["kamenica", "kamenice", "dardanë", "dardane"] },
  { id: "kline", name: "Klinë", en: "Klina", aliases: ["klina", "kline"] },
  { id: "kllokot", name: "Kllokot", en: "Kllokot", aliases: ["klokot"] },
  { id: "leposaviq", name: "Leposaviq", en: "Leposaviq", aliases: ["leposavic", "leposavić"] },
  { id: "lipjan", name: "Lipjan", en: "Lipjan", aliases: ["lipljan"] },
  { id: "malisheve", name: "Malishevë", en: "Malisheva", aliases: ["malisevo", "malisheva"] },
  { id: "mamushe", name: "Mamushë", en: "Mamusha", aliases: ["mamusa", "mamusha"] },
  { id: "mitrovice-jugut", name: "Mitrovicë e Jugut", en: "South Mitrovica", aliases: ["mitrovice", "mitrovica", "south mitrovica", "mitrovice e jugut", "mitrovica e jugut", "mitrovica e juqut"] },
  { id: "mitrovice-veriut", name: "Mitrovicë e Veriut", en: "North Mitrovica", aliases: ["north mitrovica", "mitrovice e veriut", "mitrovica e veriut", "northern mitrovica"] },
  { id: "novoberde", name: "Novobërdë", en: "Novobërda", aliases: ["novo brdo", "novoberde", "novoberda", "artana"] },
  { id: "obiliq", name: "Obiliq", en: "Obiliq", aliases: ["obilic", "kastriot", "kastrioti"] },
  { id: "partesh", name: "Partesh", en: "Partesh", aliases: ["partes"] },
  { id: "peje", name: "Pejë", en: "Peja", aliases: ["peja", "pec", "peć", "peje"] },
  { id: "podujeve", name: "Podujevë", en: "Podujeva", aliases: ["podujeva", "podujevo"] },
  { id: "prishtine", name: "Prishtinë", en: "Pristina", aliases: ["pristina", "prishtina", "pristine", "prishtine"] },
  { id: "prizren", name: "Prizren", en: "Prizren", aliases: [] },
  { id: "rahovec", name: "Rahovec", en: "Rahovec", aliases: ["orahovac"] },
  { id: "ranillug", name: "Ranillug", en: "Ranillug", aliases: ["ranilug"] },
  { id: "shtime", name: "Shtime", en: "Shtime", aliases: ["stimlje"] },
  { id: "shterpce", name: "Shtërpcë", en: "Shtërpca", aliases: ["strpce", "shterpce", "shterpca"] },
  { id: "skenderaj", name: "Skenderaj", en: "Skenderaj", aliases: ["srbica"] },
  { id: "suhareke", name: "Suharekë", en: "Suhareka", aliases: ["suva reka", "suhareka", "theranda"] },
  { id: "viti", name: "Viti", en: "Viti", aliases: ["vitina", "vita"] },
  { id: "vushtrri", name: "Vushtrri", en: "Vushtrri", aliases: ["vucitrn"] },
  { id: "zubin-potok", name: "Zubin Potok", en: "Zubin Potok", aliases: [] },
  { id: "zvecan", name: "Zveçan", en: "Zveçan", aliases: ["zvecan"] },
] as const satisfies readonly KosovoMunicipality[];

export const MUNICIPALITY_COUNT = KOSOVO_MUNICIPALITIES.length;
export const MUNICIPALITY_NAMES = KOSOVO_MUNICIPALITIES.map((m) => m.name);

/** Lowercase, no diacritics, punctuation collapsed to spaces. */
export function foldPlace(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const byFold = new Map<string, (typeof KOSOVO_MUNICIPALITIES)[number]>();
for (const m of KOSOVO_MUNICIPALITIES) {
  for (const key of [m.name, m.en, m.id.replace(/-/g, " "), ...m.aliases]) {
    const folded = foldPlace(key);
    if (folded && !byFold.has(folded)) byFold.set(folded, m);
  }
}

/** Map a typed or stored city to the official Albanian municipality name, or null if it is not one. */
export function resolveMunicipality(value: string | null | undefined): string | null {
  if (!value) return null;
  return byFold.get(foldPlace(value))?.name ?? null;
}

export function municipalityByName(name: string) {
  return KOSOVO_MUNICIPALITIES.find((m) => m.name === name) ?? null;
}

export function municipalityLabel(name: string, locale: string) {
  const m = municipalityByName(name) ?? (resolveMunicipality(name) ? municipalityByName(resolveMunicipality(name)!) : null);
  if (!m) return name;
  return locale === "en" ? m.en : m.name;
}

export function filterMunicipalities(query: string, locale: string) {
  const q = foldPlace(query);
  return KOSOVO_MUNICIPALITIES.filter((m) => {
    if (!q) return true;
    const hay = foldPlace([m.name, m.en, m.id, ...m.aliases].join(" "));
    return hay.includes(q);
  }).map((m) => ({ name: m.name, label: locale === "en" ? m.en : m.name }));
}

const municipalityMessage = "Zgjidhni një komunë të Kosovës.";

/** A single municipality: aliases are rewritten to the official Albanian name. */
export const municipalityName = z
  .string()
  .trim()
  .min(1, municipalityMessage)
  .max(80)
  .transform((value, ctx) => {
    const name = resolveMunicipality(value);
    if (!name) {
      ctx.addIssue({ code: "custom", message: municipalityMessage });
      return z.NEVER;
    }
    return name;
  });

/** One or more municipalities, de-duplicated, official names, at most all 38. */
export const municipalityNames = z
  .array(z.string())
  .min(1, municipalityMessage)
  .max(MUNICIPALITY_COUNT)
  .transform((values, ctx) => {
    const names: string[] = [];
    for (const value of values) {
      const name = resolveMunicipality(value);
      if (!name) {
        ctx.addIssue({ code: "custom", message: municipalityMessage });
        return z.NEVER;
      }
      if (!names.includes(name)) names.push(name);
    }
    if (!names.length) {
      ctx.addIssue({ code: "custom", message: municipalityMessage });
      return z.NEVER;
    }
    return names;
  });
