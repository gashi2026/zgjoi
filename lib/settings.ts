import { db } from "./db";

/* Simple JSON key-value settings stored in the Setting table. */

export async function getSetting<T>(key: string): Promise<T | null> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    return (row?.value as T) ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: unknown) {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}

/* ------------------------------------------------ typed settings */

export type SiteSettings = {
  heroTitle?: string;     // "Gjej profesionist për çdo shërbim."
  heroAccent?: string;    // "Lehtë."
  heroSubtitle?: string;
  logoUrl?: string;       // optional image URL replacing the drawn logo
};

export type HoneycombMap = Record<string, string>; // cellKey -> category slug

export const getSiteSettings = () => getSetting<SiteSettings>("site");
export const getHoneycombMap = () => getSetting<HoneycombMap>("honeycomb");
