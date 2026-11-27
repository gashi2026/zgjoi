import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { pageGuard } from "@/lib/server/guard";
import { money, dateTime, stateLabel } from "@/lib/format";
import { hoursLabel } from "@/lib/book-now";
import { outcomeLabels, readyForDecision, type DisputeOutcome } from "@/lib/dispute-rules";
import { proTrust } from "@/lib/server/trust";
import { entityId } from "@/lib/marketplace-validation";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import ArrivalAdminPanel, { arrivalAdminSelect } from "@/components/marketplace/ArrivalAdminPanel";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  const parsed = entityId.safeParse((await params).id);
  if (!parsed.success) notFound();
  const d = await db.dispute.findUnique({
    where: { id: parsed.data },
    include: { payment: { include: { request: { include: {
      client: { select: { name: true, city: true } },
      acceptedPro: { select: { id: true, slug: true, user: { select: { name: true } } } },
      acceptedQuote: { select: { amount: true, scheduledAt: true, duration: true, message: true } },
      booking: { select: { minutes: true, hourlyRateCents: true, startsAt: true, status: true, siteGeocode: true, arrival: { select: arrivalAdminSelect } } },
    } } } } },
  });
  if (!d) notFound();
  const r = d.payment.request;
  const trust = r.acceptedPro ? await proTrust(r.acceptedPro.id) : null;
  const opener = d.openedByRole === "PRO" ? t("admin.pro") : t("admin.customer"), other = d.openedByRole === "PRO" ? t("admin.customer") : t("admin.pro");
  const ready = readyForDecision(d, new Date());
  return (
    <Frame actor={actor} title={t("admin.disputeTitle", { title: r.title })} subtitle={t("admin.partiesOpenedAt", { client: r.client.name, pro: r.acceptedPro?.user.name ?? "—", date: dateTime(d.createdAt, t.locale) })}>
      <Panel>
        <h2 className="text-lg font-bold">{t("admin.jobDetails")}</h2>
        <p className="mt-2 text-sm">{t("admin.statusBeforeDispute", { label: t.tx(stateLabel(d.priorState ?? "")), city: r.city })}</p>
        <p className="text-sm">{t("admin.totalCommissionPro", { amount: money(d.payment.amount, t.locale), value: d.payment.commissionBps / 100, amount2: money(d.payment.commissionAmount, t.locale), amount3: money(d.payment.proAmount, t.locale) })}</p>
        {d.payment.estimateCreditCents > 0 && <p className="text-sm">{t("admin.estimateCredit", { amount: money(d.payment.estimateCreditCents, t.locale) })}</p>}
        <p className="text-sm">{t("admin.payment", { label: t.tx(stateLabel(d.payment.state)) })}{d.payment.heldAt ? ` · konfirmuar ${dateTime(d.payment.heldAt, t.locale)}` : ""}</p>
        {r.booking && <p className="text-sm">{t("admin.bookNowHrStarts", { label: t.tx(hoursLabel(r.booking.minutes)), amount: money(r.booking.hourlyRateCents, t.locale), date: dateTime(r.booking.startsAt, t.locale) })}</p>}
        {r.acceptedQuote?.scheduledAt && <p className="text-sm">{t("admin.schedule", { date: dateTime(r.acceptedQuote.scheduledAt, t.locale) })}{r.startedAt ? ` · filloi ${dateTime(r.startedAt, t.locale)}` : ""}{r.completedAt ? t("admin.completed", { date: dateTime(r.completedAt, t.locale) }) : ""}</p>}
        {r.detail && <p className="mt-2 whitespace-pre-wrap text-sm">{r.detail}</p>}
        {trust && <p className="mt-2 text-sm text-muted">{t("admin.prosTrackRecordJobs", { booked: trust.booked, onTime: trust.onTime, late: trust.late, notFinished: trust.notFinished, disputes: trust.disputes, cancellations: trust.cancellations })}</p>}
        <Link className="mt-2 inline-block text-sm text-gold-dark" href="/admin/pagesat">{t("admin.paymentsTasks")}</Link>
      </Panel>
      {r.booking && <ArrivalAdminPanel requestId={r.id} startsAt={r.booking.startsAt} siteGeocode={r.booking.siteGeocode} arrival={r.booking.arrival} active={false} />}
      <Panel>
        <h2 className="text-lg font-bold">{t("admin.statements")}</h2>
        <div className="mt-3 rounded-xl bg-cream p-3">
          <p className="text-xs font-semibold text-gold-dark">{opener} · {dateTime(d.createdAt, t.locale)}</p>
          <p className="whitespace-pre-wrap text-sm">{t.tx(d.reason)}</p>
        </div>
        <div className="mt-3 rounded-xl bg-cream p-3">
          <p className="text-xs font-semibold text-gold-dark">{other}{d.respondedAt ? ` · ${dateTime(d.respondedAt, t.locale)}` : ""}</p>
          <p className="whitespace-pre-wrap text-sm">{d.response ?? (d.respondBy && d.respondBy > new Date() ? t("admin.waitingUntil", { date: dateTime(d.respondBy, t.locale) }) : t("admin.noReplyWithin48"))}</p>
        </div>
      </Panel>
      <Panel>
        <h2 className="text-lg font-bold">{t("admin.decision")}</h2>
        {d.resolvedAt ? (
          <p className="mt-2 text-sm">
            {t.tx(outcomeLabels[d.outcome as DisputeOutcome]) ?? d.outcome} · {dateTime(d.resolvedAt, t.locale)}
            {d.finalPriceCents ? t("admin.finalPrice", { amount: money(d.finalPriceCents, t.locale) }) : ""}
            {d.refundCents ? ` · rimbursim ${money(d.refundCents, t.locale)}` : ""}{d.customerCreditCents ? ` · kredi ${money(d.customerCreditCents, t.locale)}` : ""}
            {d.resolution ? ` — ${t.tx(d.resolution)}` : ""}
          </p>
        ) : !ready ? (
          <p className="mt-2 text-sm">{t("admin.otherPartyHasUntil")}{" "}{d.respondBy ? dateTime(d.respondBy, t.locale) : "—"} {" "}{t("admin.addTheirStatementDecision")}</p>
        ) : (
          <ApiForm endpoint="/api/admin/disputes" values={{ action: "DECIDE", id: d.id }} label={t("admin.saveDecision")}
            confirmation={t("admin.saveDecisionBothParties")}
            fields={[
              { name: "outcome", label: t("admin.decision"), type: "select", required: true, value: "NO_ACTION",
                options: Object.entries(outcomeLabels).map(([value, label]) => ({ value, label })) },
              { name: "finalPrice", label: t("admin.finalPriceEurosOptional"), type: "number", step: "0.01", min: 0.01, max: 100000,
                hint: t("admin.currentTotalCommissionPros", { amount: money(d.payment.amount, t.locale) }) },
              { name: "customerCredit", label: t("admin.customerCreditEurosOnly"), type: "number", step: "0.01", min: 0.01, max: 100000 },
              { name: "resolution", label: t("admin.reasoningShownBothParties"), type: "textarea", required: true, minLength: 10, maxLength: 2000 },
            ]} />
        )}
      </Panel>
    </Frame>
  );
}
