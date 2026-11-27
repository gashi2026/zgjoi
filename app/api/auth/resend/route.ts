import { api } from "@/lib/server/http";
import { requestAccountToken } from "@/lib/server/accounts";
import { requireUser } from "@/lib/server/auth";
import { enforceLimit } from "@/lib/server/rate-limit";
import { scheduleAccountEmail } from "@/lib/server/account-email";
import { getT } from "@/lib/i18n/server";
export const maxDuration = 30;
export async function POST(req: Request) {
  const t = await getT();
  return api(req, async () => {
    const user = await requireUser();
    if (user.emailVerified)
      return { ok: true, message: t("api.emailHasBeenVerified") };
    await enforceLimit(`resend:${user.id}`, 3, 3600000);
    const result = await requestAccountToken(user.id, "EMAIL_VERIFY");
    scheduleAccountEmail(result.jobId);
    return {
      ok: result.queued,
      message: result.queued
        ? t("api.emailQueuedSending")
        : t("api.emailSendingIsntAvailable"),
    };
  });
}
