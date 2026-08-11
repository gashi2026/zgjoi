import { db } from "./db";
import { KOMISIONI } from "@/lib/account";

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
  const v = await getSetting<number>("commissionBps");
  return typeof v === "number" && v >= 0 && v <= 5000 ? v : Math.round(KOMISIONI * 100);
}

/** Split a client payment into commission + professional payout. */
export function splitAmount(totalCents: number, bps: number) {
  const commissionAmount = Math.round((totalCents * bps) / 10000);
  return {
    commissionAmount,
    proAmount: totalCents - commissionAmount,
  };
}

/** Cost of opening one lead, in cents. Admin-overridable via Setting. */
export async function leadCostCents(): Promise<number> {
  const v = await getSetting<number>("leadCostCents");
  return typeof v === "number" && v >= 0 && v <= 100000 ? v : 400;
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
