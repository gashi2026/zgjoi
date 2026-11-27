import { z } from "zod";
import { api, json, readJson, requestIp } from "@/lib/server/http";
import { equalSecret, previewCookie } from "@/lib/server/tokens";
import { AppError } from "@/lib/server/errors";
import { enforceLimit } from "@/lib/server/rate-limit";
import { getT } from "@/lib/i18n/server";
export async function POST(req: Request) {
  const t = await getT();
  return api(req, async () => {
    const { fjalekalimi } = z
      .object({ fjalekalimi: z.string().max(256) })
      .parse(await readJson(req));
    const password = process.env.ZGJOI_PASSWORD;
    // Database-backed limiting applies to both correct and incorrect guesses.
    await enforceLimit(`site-lock:${requestIp(req.headers)}`, 20, 900000);
    if (!password || !equalSecret(fjalekalimi, password))
      throw new AppError("PASSWORD", 401, t("api.passwordIncorrect"));
    const response = json({ ok: true });
    response.cookies.set("zgjoi_preview", previewCookie(password), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    return response;
  });
}
