import { daysAgo } from "@/lib/server/time";
import Link from "@/components/i18n/Link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { money } from "@/lib/format";
import { paymentsReady } from "@/lib/server/payments";
import { bookingFunnel } from "@/lib/server/metrics";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  const since = daysAgo(30);
  const [
    users,
    pros,
    pending,
    requests,
    completed,
    held,
    released,
    tickets,
    events,
    heartbeat,
    failedMail,
    funnel,
  ] = await Promise.all([
    db.user.count(),
    db.proProfile.count({
      where: {
        verification: "APPROVED",
        user: { suspendedAt: null, role: "PRO" },
      },
    }),
    db.proProfile.count({ where: { verification: "PENDING" } }),
    db.serviceRequest.count(),
    db.serviceRequest.count({
      where: { state: "COMPLETED", completedAt: { not: null } },
    }),
    db.payment.aggregate({ where: { state: "HELD" }, _sum: { amount: true } }),
    db.payment.aggregate({
      where: { state: "RELEASED" },
      _sum: { commissionAmount: true },
    }),
    db.supportTicket.count({ where: { state: "OPEN" } }),
    db.auditLog.groupBy({
      by: ["action"],
      where: {
        createdAt: { gte: since },
        action: {
          in: [
            "ACCOUNT_CREATED",
            "INQUIRY_CREATED",
            "OFFER_SENT",
            "OFFER_ACCEPTED",
            "PAYMENT_HELD",
            "CONFIRM_COMPLETION",
            "FUNDS_TRANSFERRED",
            "REVIEW_PUBLISHED",
          ],
        },
      },
      _count: true,
    }),
    db.setting.findUnique({ where: { key: "maintenanceHeartbeat" } }),
    db.outbox.count({ where: { state: "FAILED", OR: [{ lastError: null }, { lastError: { not: "MESSAGE_SUPPRESSED" } }] } }),
    bookingFunnel(since),
  ]);
  const idPending = await db.idVerification.count({ where: { status: "PENDING" } });
  return (
    <Frame actor={actor} title={t("admin.zgjoiAdmin")}>
      {idPending > 0 && (
        <Link href="/admin/verifikimi" className="block rounded-2xl border border-gold/50 bg-honey p-4 font-semibold">
          🪪 {idPending} {idPending === 1 ? "dokument identifikimi pret" : "dokumente identifikimi presin"} {" "}{t("admin.review")}</Link>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [t("admin.accounts"), users],
          [t("admin.approvedPros"), pros],
          [t("admin.requests"), requests],
          [t("admin.completedJobs"), completed],
          [t("admin.paymentsHeld"), money(held._sum.amount ?? 0, t.locale)],
          [
            t("admin.commissionFromTransfers"),
            money(released._sum.commissionAmount ?? 0, t.locale),
          ],
        ].map(([label, value]) => (
          <Panel key={label}>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </Panel>
        ))}
      </div>
      <Panel>
        <h2 className="mb-3 text-lg font-bold">{t("admin.requestFunnelLast30")}</h2>
        <p className="mb-4 text-sm text-muted">{t("admin.sameGroupRequestsCreation")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-line"><th className="py-3">{t("admin.stepReached")}</th><th className="py-3">{t("admin.requests")}</th><th className="py-3">{t("admin.all")}</th></tr></thead>
            <tbody>{[
              [t("admin.privateRequest"), funnel.inquiries], [t("admin.leastOneFormalOffer"), funnel.offered],
              [t("admin.offerAccepted"), funnel.accepted], [t("admin.paymentEverConfirmed"), funnel.funded],
              [t("admin.completionConfirmedCustomer"), funnel.completed],
            ].map(([label, count]) => <tr key={label} className="border-b border-line"><th className="py-3 font-normal">{label}</th><td>{count}</td><td>{funnel.inquiries ? `${Math.round(Number(count) / funnel.inquiries * 100)}%` : "—"}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">{t("admin.stepsHistoricalLaterRefund")}</p>
        {!funnel.coherent && <p role="alert" className="mt-3 text-sm text-red-800">{t("admin.theseNumbersNeedIntegrity")}</p>}
      </Panel>
      <Panel>
        <Link href="/admin/perdoruesit" className="mr-5 text-gold-dark">
          {t("admin.profilesUnderReview", { pending: pending })}</Link>
        <Link href="/admin/mbeshtetja" className="text-gold-dark">
          {t("admin.openChats", { tickets: tickets })}</Link>
      </Panel>
      <Panel>
        <h2 className="mb-3 text-lg font-bold">
          {t("admin.activityLast30Days")}</h2>
        <p className="mb-3 text-sm text-muted">
          {t("admin.countRecordedEventsThese")}</p>
        {events.map((e) => (
          <p key={e.action}>
            {e.action}: {e._count}
          </p>
        ))}
        {!events.length && <p>{t("admin.noEventsRecordedYet")}</p>}
      </Panel>
      <Panel>
        <h2 className="mb-3 text-lg font-bold">{t("admin.operationalStatus")}</h2>
        <p>{t("admin.payments")}{" "}{paymentsReady() ? t("admin.testOnly") : t("admin.switchedOff")}</p>
        <p>
          {t("admin.email")}{" "}
          {process.env.EMAIL_DELIVERY_ENABLED === "true" &&
          process.env.RESEND_API_KEY &&
          process.env.EMAIL_FROM
            ? t("admin.configuredCheckDelivery")
            : t("admin.needsSetup")}
        </p>
        <p>{t("admin.emailsNeedReview", { failedMail: failedMail })}</p>
        <p>
          {t("admin.scheduledJob")}{" "}
          {heartbeat
            ? JSON.stringify(heartbeat.value)
            : t("admin.noRunRecorded")}
        </p>
        <p className="mt-2 text-sm text-muted">
          {t("admin.panelDoesntProveBanking")}</p>
      </Panel>
    </Frame>
  );
}
