/** The owner's 13-category payment-blueprint catalogue (Valle is no longer a category of its own:
 * it lives under Kurse, see `kurseSubjects`). Legacy slugs are read aliases only: new profiles and
 * requests use the canonical slug. */
export const serviceCategories = [
  { slug: "pastrim", name: "Pastrim", icon: "sparkles", group: "Shtëpia", aliases: [] },
  { slug: "dado", name: "Dado", icon: "baby", group: "Kujdesi", aliases: ["nane"] },
  { slug: "perkthyes", name: "Përkthim profesional", icon: "languages", group: "Biznesi", aliases: [] },
  { slug: "grim", name: "Grim", icon: "sparkles2", group: "Bukuria", aliases: ["makeup"] },
  { slug: "frizer", name: "Frizer", icon: "scissors", group: "Bukuria", aliases: ["parukeri", "berber"] },
  { slug: "kurse", name: "Kurse", icon: "bookOpen", group: "Arsimi", aliases: ["tutor", "valle", "balet", "vallezim", "vallzim"] },
  { slug: "korrier", name: "Korrier", icon: "mail", group: "Biznesi", aliases: ["postier"] },
  { slug: "elektricist", name: "Elektricist", icon: "zap", group: "Shtëpia", aliases: [] },
  { slug: "mjeshter-i-ujit", name: "Mjeshtër i Ujit", icon: "droplets", group: "Shtëpia", aliases: ["hidraulik"] },
  { slug: "ngrohje-klimatizim", name: "Ngrohje & Klimatizim", icon: "wind", group: "Shtëpia", aliases: ["klima", "klimatizim"] },
  { slug: "shtepiak", name: "Shtëpiak", icon: "wrench", group: "Shtëpia", aliases: ["riparime"] },
  { slug: "moler", name: "Moler", icon: "paintbrush", group: "Shtëpia", aliases: ["piktor"] },
  { slug: "kopshtar", name: "Kopshtar", icon: "leaf", group: "Shtëpia", aliases: ["kopsht"] },
] as const;

export type ServiceCategorySlug = (typeof serviceCategories)[number]["slug"];

/** What a Kurse (lessons / tutoring) pro teaches. A subject is a profession of its own on a pro's
 * profile (own price, rate and minimum hours) but belongs to its parent category everywhere
 * else: requests, hiring paths and commission all resolve to `kurse`. `legacy` lists old
 * category slugs that now mean this subject (Valle used to be a category of its own). Names are
 * Albanian; English comes from the `category.*` messages. */
export const kurseSubjects = [
  { slug: "kurse-anglisht", name: "Anglisht", parent: "kurse", legacy: [] },
  { slug: "kurse-gjermanisht", name: "Gjermanisht", parent: "kurse", legacy: [] },
  { slug: "kurse-frengjisht", name: "Frëngjisht", parent: "kurse", legacy: [] },
  { slug: "kurse-italisht", name: "Italisht", parent: "kurse", legacy: [] },
  { slug: "kurse-matematike", name: "Matematikë", parent: "kurse", legacy: [] },
  { slug: "kurse-fizike-kimi", name: "Fizikë & Kimi", parent: "kurse", legacy: [] },
  { slug: "kurse-programim", name: "Programim", parent: "kurse", legacy: [] },
  { slug: "kurse-provime", name: "Përgatitje për provime (Matura)", parent: "kurse", legacy: [] },
  { slug: "kurse-muzike", name: "Muzikë (piano, kitarë, violinë)", parent: "kurse", legacy: [] },
  { slug: "kurse-kendim", name: "Këndim", parent: "kurse", legacy: [] },
  { slug: "kurse-vallezim", name: "Vallëzim", parent: "kurse", legacy: ["vallezim", "vallzim"] },
  { slug: "kurse-balet", name: "Balet", parent: "kurse", legacy: ["balet"] },
  { slug: "kurse-valle-popullore", name: "Valle popullore", parent: "kurse", legacy: ["valle"] },
  { slug: "kurse-art", name: "Art & vizatim", parent: "kurse", legacy: [] },
  { slug: "kurse-patente", name: "Teori për patentë shoferi", parent: "kurse", legacy: [] },
  { slug: "kurse-tjeter", name: "Lëndë tjetër", parent: "kurse", legacy: [] },
] as const;
export type KurseSubjectSlug = (typeof kurseSubjects)[number]["slug"];

/** The subject a slug names: a subject slug itself, or a legacy Valle slug. Plain `kurse` is none. */
export function serviceSubject(slug: string) {
  const s = String(slug ?? "").trim();
  return kurseSubjects.find(x => x.slug === s) ?? kurseSubjects.find(x => (x.legacy as readonly string[]).includes(s));
}
export function subjectsOf(parentSlug: string) {
  return kurseSubjects.filter(x => x.parent === parentSlug);
}
/** The top-level category of a slug: canonical, alias or subject. */
export function serviceCategory(slug: string) {
  const subject = serviceSubject(slug);
  const key = subject ? subject.parent : slug;
  return serviceCategories.find(c => c.slug === key || (c.aliases as readonly string[]).includes(key));
}
/** The profession a pro profile row stands for: its subject when there is one (legacy Valle slugs
 * included), else the top-level category. Undefined when not in the catalogue. */
export function professionSlug(slug: string): string | undefined {
  return serviceSubject(slug)?.slug ?? serviceCategory(slug)?.slug;
}
/** Display name of a profession, e.g. "Kurse · Anglisht"; `tx` translates each Albanian part. */
export function professionLabel(slug: string, tx: (text: string) => string = (x) => x): string {
  const subject = serviceSubject(slug);
  const category = serviceCategory(slug);
  if (!category) return slug;
  return subject ? `${tx(category.name)} · ${tx(subject.name)}` : tx(category.name);
}
/** True when the row (any slug form) falls under the searched/requested slug: the same subject when
 * a subject was asked for, otherwise anywhere under the same top-level category. */
export function sameProfession(row: string, wanted: string): boolean {
  if (serviceSubject(wanted)) return professionSlug(row) === professionSlug(wanted);
  const a = serviceCategory(row)?.slug;
  return !!a && a === serviceCategory(wanted)?.slug;
}
/** Every stored slug that a search for this slug should match. */
export function categorySlugs(slug: string): string[] {
  const subject = serviceSubject(slug);
  if (subject) return [subject.slug, ...subject.legacy];
  const category = serviceCategory(slug);
  return category ? [category.slug, ...category.aliases, ...subjectsOf(category.slug).map(x => x.slug)] : [];
}
export const allowedCategorySlugs = serviceCategories.flatMap(c => [c.slug, ...c.aliases]);

/** Preserve saved placement where it is still allowed. Removed services become
 * decorative cells rather than links to an unavailable profession. */
export function approvedHoneycomb(map: Record<string, string>) {
  return Object.fromEntries(Object.entries(map).flatMap(([cell, slug]) => {
    const category = serviceCategory(slug);
    return category ? [[cell, category.slug]] : [];
  }));
}

export type ProfessionOption = { slug: string; label: string; short: string; icon: string; group?: string; hidden?: boolean };
/** Pickable professions: every category as one option, except Kurse, which becomes its subjects
 * (`group` = "Kurse", `short` = the subject alone, `label` = "Kurse · Anglisht"). Plain Kurse stays
 * in the list as `hidden` so a profile that still has it shows a proper name. `tx` translates. */
export function professionOptions(cats: readonly { slug: string; name: string; icon: string }[], tx: (text: string) => string): ProfessionOption[] {
  return cats.flatMap((c) => {
    const subjects = subjectsOf(c.slug);
    if (!subjects.length) return [{ slug: c.slug, label: tx(c.name), short: tx(c.name), icon: c.icon }];
    return [
      { slug: c.slug, label: tx(c.name), short: tx(c.name), icon: c.icon, hidden: true },
      ...subjects.map((x) => ({ slug: x.slug, label: `${tx(c.name)} · ${tx(x.name)}`, short: tx(x.name), icon: c.icon, group: tx(c.name) })),
    ];
  });
}
