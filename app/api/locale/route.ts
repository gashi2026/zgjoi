import { z } from "zod";
import { api, readJson } from "@/lib/server/http";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { setLocaleCookie } from "@/lib/server/locale";
import { LOCALES } from "@/lib/i18n/config";
export const dynamic = "force-dynamic";

/** Language switcher: remember the choice in a cookie and, when signed in, on the profile. */
export async function POST(req: Request) {
  return api(req, async () => {
    const { locale } = z.object({ locale: z.enum(LOCALES) }).strict().parse(await readJson(req, 256));
    await setLocaleCookie(locale);
    const user = await currentUser();
    if (user) await db.user.update({ where: { id: user.id }, data: { locale } });
    return { ok: true, locale };
  });
}
