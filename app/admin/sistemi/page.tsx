import { pageGuard } from "@/lib/server/guard";
import { operationalHealth } from "@/lib/server/operations";
import { dateTime } from "@/lib/format";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  const health = await operationalHealth();
  const maintenance = { UNKNOWN: t("admin.noVerifiedRun"), LATE: t("admin.scheduledJobLate"), RECENT: t("admin.ranLast15Minutes") }[health.maintenance];
  return <Frame actor={actor} title={t("admin.serviceStatus")} subtitle={t("admin.checkedKosovoTime", { date: dateTime(health.checkedAt, t.locale) })}>
    <Panel>
      <h2 className="text-lg font-bold">{t("admin.staffSecurity")}</h2>
      <p className="mt-3">{t("admin.activeStaffAccountsUse", { enabled: health.staffMfa.enabled, total: health.staffMfa.total })}</p>
      {health.staffMfa.enabled < health.staffMfa.total && <p className="mt-2 text-sm text-amber-900">{t("admin.everyAdminSupportMember")}</p>}
      {health.staffMfa.errors > 0 && <p className="mt-2 text-sm text-red-800">{t("admin.settingsNeedTechnicalCheck", { errors: health.staffMfa.errors })}</p>}
      <a className="mt-3 inline-block underline" href="/siguria">{t("admin.setUpAccountSecurity")}</a>
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">{t("admin.scheduledJob2")}</h2>
      <p className={`mt-3 font-semibold ${health.maintenance === "RECENT" ? "text-green-800" : "text-amber-900"}`}>{maintenance}</p>
      {health.maintenance !== "RECENT" && <p className="mt-2 text-sm">{t("admin.checkScheduledJobRunning")}</p>}
      {health.environment === "PREVIEW" && <p className="mt-2 text-sm text-muted">{t("admin.testEnvironmentAutomaticRuns")}</p>}
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">{t("admin.accountEmail")}</h2>
      <p className="mt-3">{health.emailConfigured ? t("admin.configuredDeliveryStillNeeds") : t("admin.needsSwitchedDeliveryTested")}</p>
      <p className="mt-2 text-sm">{t("admin.optionalJobEmails")}{" "}{health.jobEmailEnabled ? t("admin.onlyUsersWhoChoose") : t("admin.notYet")}.</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li>{t("admin.failedSendsNeedReview", { failed: health.mail.failed })}</li>
        <li>{t("admin.sendsMoreThan15", { overdue: health.mail.overdue })}</li>
        <li>{t("admin.sendsHaveBeenStuck", { processingExpired: health.mail.processingExpired })}</li>
      </ul>
      <p className="mt-3 text-sm text-muted">{t("admin.expiredVerificationRecoveryLink")}</p>
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">{t("admin.privateDocuments")}</h2>
      <p className="mt-3">{health.documentsConfigured ? t("admin.configuredPrivateAccessDelivery") : t("admin.uploadsNeedSetupPrivate")}</p>
    </Panel>
  </Frame>;
}
