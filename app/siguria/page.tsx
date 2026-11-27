import { pageGuard } from "@/lib/server/guard";
import { accountSessions } from "@/lib/server/auth";
import { dateTime } from "@/lib/format";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import MfaPanel from "@/components/marketplace/MfaPanel";
import { mfaStatus } from "@/lib/server/mfa";
import { notificationPreferences } from "@/lib/server/notification-preferences";
import { db } from "@/lib/server/db";
import { getT, pageMetadata } from "@/lib/i18n/server";
export const generateMetadata = () => pageMetadata({ title: "meta.securityTitle", robots: { index: false, follow: false } });
export const dynamic = "force-dynamic";
export default async function Page() {
  const t = await getT();
  const actor = await pageGuard();
  const [sessions, mfa, preferences] = await Promise.all([accountSessions(actor), mfaStatus(actor), notificationPreferences(db, actor.id)]);
  return <Frame actor={actor} title={t("security.accountSecurity")}>
    <Panel><MfaPanel {...mfa} staff={actor.role === "ADMIN" || actor.role === "SUPPORT"} /></Panel>
    <Panel>
      <h2 className="mb-3 text-lg font-bold">{t("security.emailNotifications")}</h2>
      <p className="mb-4 text-sm text-muted">{t("security.notificationsAccountAlwaysOptional")}</p>
      {process.env.JOB_EMAILS_ENABLED !== "true" && <p className="mb-3 text-sm">{t("security.theseNotificationsArentBeing")}</p>}
      <ApiForm endpoint="/api/account/notifications" label={t("security.savePreferences")}
        fields={[{ name: "jobEmail", label: t("security.emailMeAboutMy"), type: "checkbox", checked: preferences.jobEmail }]} />
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">{t("security.activeSessions")}</h2>
      <p className="mt-2 text-sm text-muted">{t("security.showsUp50Most")}</p>
      <ul className="mt-4 divide-y divide-line">
        {sessions.map((session, i) => <li key={i} className="py-3 text-sm">
          <p className="font-semibold">{session.current ? t("security.session") : t("security.otherSession")}</p>
          <p>{t("security.started", { date: dateTime(session.createdAt, t.locale) })}</p>
          <p>{t("security.expires", { date: dateTime(session.expiresAt, t.locale) })}</p>
        </li>)}
      </ul>
    </Panel>
    <Panel>
      <h2 className="mb-3 text-lg font-bold">{t("security.signOutOtherSessions")}</h2>
      <p className="mb-4 text-sm text-muted">{t("security.ifForgotLogOut")}</p>
      <ApiForm endpoint="/api/account/sessions" label={t("security.signOutOtherSessions")}
        confirmation={t("security.signOutAllOther")}
        fields={[{ name: "currentPassword", label: t("security.currentPassword"), type: "password", required: true, autoComplete: "current-password" }]} />
    </Panel>
  </Frame>;
}
