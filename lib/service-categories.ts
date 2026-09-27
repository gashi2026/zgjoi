/** The owner's 14-category payment-blueprint catalogue. Legacy slugs are
 * read aliases only: new profiles and requests use the canonical slug. */
export const serviceCategories = [
  { slug: "pastrim", name: "Pastrim", icon: "sparkles", group: "Shtëpia", aliases: [] },
  { slug: "dado", name: "Dado", icon: "baby", group: "Kujdesi", aliases: ["nane"] },
  { slug: "perkthyes", name: "Përkthim profesional", icon: "languages", group: "Biznesi", aliases: [] },
  { slug: "grim", name: "Grim", icon: "sparkles2", group: "Bukuria", aliases: ["makeup"] },
  { slug: "frizer", name: "Frizer", icon: "scissors", group: "Bukuria", aliases: ["parukeri", "berber"] },
  { slug: "kurse", name: "Kurse", icon: "bookOpen", group: "Arsimi", aliases: ["tutor"] },
  { slug: "valle", name: "Valle", icon: "drama", group: "Arsimi", aliases: ["balet", "vallezim", "vallzim"] },
  { slug: "korrier", name: "Korrier", icon: "mail", group: "Biznesi", aliases: ["postier"] },
  { slug: "elektricist", name: "Elektricist", icon: "zap", group: "Shtëpia", aliases: [] },
  { slug: "mjeshter-i-ujit", name: "Mjeshtër i Ujit", icon: "droplets", group: "Shtëpia", aliases: ["hidraulik"] },
  { slug: "ngrohje-klimatizim", name: "Ngrohje & Klimatizim", icon: "wind", group: "Shtëpia", aliases: ["klima", "klimatizim"] },
  { slug: "shtepiak", name: "Shtëpiak", icon: "wrench", group: "Shtëpia", aliases: ["riparime"] },
  { slug: "moler", name: "Moler", icon: "paintbrush", group: "Shtëpia", aliases: ["piktor"] },
  { slug: "kopshtar", name: "Kopshtar", icon: "leaf", group: "Shtëpia", aliases: ["kopsht"] },
] as const;

export type ServiceCategorySlug = (typeof serviceCategories)[number]["slug"];
export function serviceCategory(slug: string) {
  return serviceCategories.find(c => c.slug === slug || (c.aliases as readonly string[]).includes(slug));
}
export function categorySlugs(slug: string): string[] {
  const category = serviceCategory(slug);
  return category ? [category.slug, ...category.aliases] : [];
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
