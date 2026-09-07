import { db } from "./db";
import { invariant } from "./errors";

/* ------------------------------------------------ JSON key-value store */

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

/* ------------------------------------------------------ money settings */

/** Commission in basis points (1500 = 15%). Admin-overridable via Setting. */
export async function commissionBps(): Promise<number> {
  const row = await db.setting.findUnique({ where: { key: "commissionBps" } });
  const v = row?.value ?? 1500;
  invariant(
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 5000,
    "COMMISSION_CONFIG",
    503,
    "Konfigurimi i pagesës kërkon kontroll.",
  );
  return v;
}

/** Split a client payment into commission + professional payout. */
export function splitAmount(totalCents: number, bps: number) {
  invariant(
    Number.isSafeInteger(totalCents) &&
      totalCents > 0 &&
      totalCents <= 10_000_000 &&
      Number.isInteger(bps) &&
      bps >= 0 &&
      bps <= 5000,
    "MONEY",
    400,
    "Shuma nuk është e vlefshme.",
  );
  const commissionAmount = Math.round((totalCents * bps) / 10000);
  return {
    commissionAmount,
    proAmount: totalCents - commissionAmount,
  };
}

/* ------------------------------------------------------- site settings */

export type SiteSettings = {
  heroTitle?: string;
  heroAccent?: string;
  heroSubtitle?: string;
  logoUrl?: string;
};

export type HoneycombMap = Record<string, string>; // cellKey -> category slug

export const getSiteSettings = () => getSetting<SiteSettings>("site");
export const getHoneycombMap = () => getSetting<HoneycombMap>("honeycomb");
