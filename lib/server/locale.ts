import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { LOCALE_COOKIE, isLocale, type Locale } from "../i18n/config";
import { getLocale } from "../i18n/server";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocaleCookie(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/", maxAge: ONE_YEAR, sameSite: "lax", secure: process.env.NODE_ENV === "production",
  });
}

/**
 * After login: a saved profile language wins and is applied to this browser;
 * if the account never chose one, the language currently in use is saved.
 */
export async function syncLocaleOnLogin(userId: string): Promise<Locale> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (isLocale(user?.locale)) {
    await setLocaleCookie(user.locale);
    return user.locale;
  }
  const current = await getLocale();
  await db.user.update({ where: { id: userId }, data: { locale: current } });
  return current;
}
