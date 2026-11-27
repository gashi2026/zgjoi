import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { getRequest } from "@/lib/server/marketplace";
import { AppError } from "@/lib/server/errors";
import { paymentsReady } from "@/lib/server/payments";
import { bookingCommission } from "@/lib/server/commissions";
import { db } from "@/lib/server/db";
import { helplineLink } from "@/lib/server/arrival";
import { readRecurrence, recurrenceLabels } from "@/lib/recurring-bookings";
import { money, stateLabel, dateTime } from "@/lib/format";
import { ESTIMATE_PRO_SHARE_CENTS, ESTIMATE_PLATFORM_SHARE_CENTS } from "@/lib/book-now";
import { appointmentEnd } from "@/lib/appointments";
import Frame, { Panel } from "./Frame";
import ApiForm from "./ApiForm";
import Thread, { type ThreadEvent } from "./Thread";
import { BookingPanel, bookingEvents } from "./BookingPanel";
import { estimateStateLabels } from "@/lib/estimate-labels";
import { canOpenDispute, outcomeLabels, DISPUTE_OPEN_DAYS, DISPUTE_RESPONSE_HOURS, type DisputeOutcome } from "@/lib/dispute-rules";
import { serviceCategory } from "@/lib/service-categories";
import { DEFAULT_CHAT_TIMING } from "@/lib/marketplace-validation";
import { jobStages, jobStatus, timelineEventLabel } from "@/lib/chat-timeline";
import { getT } from "@/lib/i18n/server";
export default async function JobDetail({
  id,
  pro,
}: {
  id: string;
  pro: boolean;
}) {
  const t = await getT();
  const actor = await pageGuard(pro ? "PRO" : "CLIENT");
  let request;
  try {
    request = await getRequest(actor, id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const latest = request.quotes.find(
    (q) => q.state === "SENT" && q.expiresAt && q.expiresAt > new Date(),
  );
  const recurrence = readRecurrence(request.answers);
  const funded = request.payment?.state === "HELD";
  let commission: Awaited<ReturnType<typeof bookingCommission>> | null = null;
  let commissionError: string | null = null;
  if (pro && ["OPEN", "QUOTED"].includes(request.state)) {
    try {
      commission = await bookingCommission(db, request, latest?.scheduledAt ?? (recurrence ? new Date(recurrence.scheduledAt) : null));
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "RECURRENCE_UNAVAILABLE") throw error;
      commissionError = error.message;
    }
  }
  const active = ["BOOKED", "IN_PROGRESS"].includes(request.state);
  // Arrita: the prefilled WhatsApp link to the Zgjoi helpline, for the pro after check-in.
  const arrival = request.booking?.arrival;
  const whatsapp = pro && arrival
    ? helplineLink({ request: { client: await db.user.findUniqueOrThrow({ where: { id: request.clientId }, select: { name: true, phone: true } }) } }, arrival, request.id)
    : null;
  // Recurring schedules: the series this booking belongs to, or an open pro proposal made from it.
  const seriesSelect = { id: true, cadence: true, weekday: true, monthDay: true, startMinute: true, status: true, minutes: true,
    hourlyRateCents: true, firstStartsAt: true, categorySlug: true, proposedBy: true } as const;
  const [series, proposal] = request.booking ? await Promise.all([
    request.booking.seriesId ? db.recurringSeries.findUnique({ where: { id: request.booking.seriesId }, select: seriesSelect }) : null,
    db.recurringSeries.findFirst({ where: { sourceRequestId: id, status: "PROPOSED" }, orderBy: { createdAt: "desc" }, select: seriesSelect }),
  ]) : [null, null];
  const estimate = request.estimate;
  const counterpart = pro ? request.client.name : (request.selectedPro?.user.name ?? t("jobDetail.pro"));
  const category = t.tx(serviceCategory(request.categorySlug)?.name ?? request.categorySlug);
  const status = jobStatus(request.state);
  const closed = ["CANCELLED", "COMPLETED"].includes(request.state);
  // "Në progres" has no column of its own; the job-start audit row dates it.
  const started = ["IN_PROGRESS", "COMPLETED", "DISPUTED"].includes(request.state)
    ? await db.auditLog.findFirst({
        where: { action: "START", target: request.id },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      })
    : null;
  const jobAction = (
    action: string,
    label: string,
    confirmation?: string,
    quoteId?: string,
  ) => (
    <ApiForm
      endpoint={`/api/requests/${id}`}
      values={{ action, quoteId, expectedVersion: request.version }}
      label={label}
      confirmation={confirmation}
    />
  );
  const hiredRevision = Math.min(
    Infinity,
    ...request.quotes.filter((q) => q.acceptedAt).map((q) => q.revision),
  );
  const side = (mine: boolean) => (mine ? "ml-auto" : "mr-auto");
  const statusLine = (key: string, at: Date | null | undefined): ThreadEvent[] => {
    const label = t.tx(timelineEventLabel(key, pro));
    return at && label
      ? [{
          id: `status-${key}`,
          createdAt: at.toISOString(),
          node: (
            <p role="status" className="mx-auto w-fit max-w-full rounded-full border border-gold/40 bg-white px-4 py-2 text-center text-xs font-semibold">
              {label} · {dateTime(at, t.locale)}
            </p>
          ),
        }]
      : [];
  };
  const quoteCard = (quote: (typeof request.quotes)[number]): ThreadEvent => {
    const expired = quote.state === "SENT" && quote.expiresAt && quote.expiresAt <= new Date();
    // Anything sent after the hire is a schedule-change proposal, not a new price.
    const reschedule = quote.revision > hiredRevision;
    const current = latest?.id === quote.id;
    const end = quote.scheduledAt ? appointmentEnd(quote.scheduledAt, quote.duration) : null;
    return {
      id: `quote-${quote.id}`,
      createdAt: quote.createdAt.toISOString(),
      node: (
        <article
          aria-label={t("jobDetail.offer", { revision: quote.revision })}
          className={`max-w-[92%] rounded-2xl border-2 bg-white p-4 shadow-soft sm:max-w-md ${current || quote.state === "ACCEPTED" ? "border-gold" : "border-line"} ${side(pro)}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
              {reschedule ? t("jobDetail.proposedNewTime") : t("jobDetail.offerVersion", { revision: quote.revision })}
            </p>
            <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">
              {expired ? t("jobDetail.expired") : t.tx(stateLabel(quote.state))}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold">{money(quote.amount, t.locale)}</p>
          {quote.message && <p className="mt-2 whitespace-pre-wrap text-sm">{quote.message}</p>}
          {quote.availableAt && <p className="mt-2 text-sm">{t("jobDetail.schedule", { availableAt: quote.availableAt })}</p>}
          {quote.scheduledAt ? (
            <p className="mt-1 text-sm">
              {t("jobDetail.startKosovoTime", { date: dateTime(quote.scheduledAt, t.locale) })}{end && <> {" "}{t("jobDetail.expectedFinish", { date: dateTime(end, t.locale) })}</>}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">{t("jobDetail.jobDateAgreedChat")}</p>
          )}
          {reschedule && <p className="mt-2 text-sm font-semibold">{t("jobDetail.priceJobStaySame")}</p>}
          {quote.expiresAt && quote.state === "SENT" && (
            <p className="mt-1 text-xs text-muted">{t("jobDetail.validUntil", { date: dateTime(quote.expiresAt, t.locale) })}</p>
          )}
          {!pro && current && request.state === "QUOTED" && (
            <div className="mt-4 flex flex-wrap gap-3">
              <ApiForm
                endpoint="/api/offers/accept"
                values={{ quoteId: quote.id, expectedVersion: request.version }}
                label={t("jobDetail.hire")}
                confirmation={t("jobDetail.hireJobMovesAccepted", { counterpart: counterpart, amount: money(quote.amount, t.locale) })}
              />
              {jobAction("DECLINE", t("jobDetail.declineOffer"), undefined, quote.id)}
            </div>
          )}
          {pro && current && request.state === "QUOTED" && (
            <div className="mt-4">{jobAction("WITHDRAW", t("jobDetail.withdrawOffer"), t("jobDetail.withdrawOffer2"), quote.id)}</div>
          )}
          {request.state === "BOOKED" && request.unpaidEditable && current && (
            <div className="mt-4 flex flex-wrap gap-3">
              {(pro ? ["WITHDRAW"] : ["ACCEPT", "DECLINE"]).map(action => (
                <ApiForm key={action} endpoint={`/api/requests/${id}/reschedule`}
                  values={{ action, quoteId: quote.id, expectedVersion: request.version }}
                  label={action === "ACCEPT" ? t("jobDetail.acceptNewTime") : action === "DECLINE" ? t("jobDetail.keepPreviousTime") : t("jobDetail.withdrawProposal")}
                  confirmation={action === "ACCEPT" && quote.scheduledAt ? t("jobDetail.moveBookingPriceStays", { date: dateTime(quote.scheduledAt, t.locale), amount: money(quote.amount, t.locale) }) : undefined} />
              ))}
            </div>
          )}
          <time className="mt-2 block text-xs text-muted">{dateTime(quote.createdAt, t.locale)}</time>
        </article>
      ),
    };
  };
  const events: ThreadEvent[] = [
    {
      id: "intro",
      createdAt: request.createdAt.toISOString(),
      node: (
        <div className={`max-w-[92%] rounded-xl p-3 ${pro ? "mr-auto bg-white" : "ml-auto bg-honey"}`}>
          <p className="text-xs font-semibold text-gold-dark">{t("jobDetail.jobDescription")}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.detail}</p>
          {request.timing !== DEFAULT_CHAT_TIMING && <p className="mt-2 text-xs text-muted">{t("jobDetail.requestedTiming", { timing: request.timing })}</p>}
          {recurrence && <p className="mt-2 text-xs">
            {t("jobDetail.recurringVisitKosovoTime", { value: recurrenceLabels[recurrence.cadence], date: dateTime(new Date(recurrence.scheduledAt), t.locale) })}</p>}
          {request.address && <p className="mt-2 text-xs">{t("jobDetail.address", { address: request.address })}</p>}
          <time className="mt-1 block text-xs text-muted">{dateTime(request.createdAt, t.locale)}</time>
        </div>
      ),
    },
    // Paid estimate visit (step 4): its card, payment status and the credit rule.
    ...(estimate ? [{
      id: `estimate-${estimate.id}`, createdAt: estimate.createdAt.toISOString(),
      node: (
        <article aria-label={t("jobDetail.estimateVisit")} className={`max-w-[92%] rounded-2xl border-2 border-gold bg-white p-4 shadow-soft sm:max-w-md ${pro ? "mr-auto" : "ml-auto"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{t("jobDetail.estimateVisit2")}</p>
            <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">{t.tx(estimateStateLabels[estimate.state]) ?? estimate.state}</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{money(estimate.amountCents, t.locale)}</p>
          {estimate.visitAt && <p className="mt-1 text-sm">{t("jobDetail.requestedVisitKosovoTime", { date: dateTime(estimate.visitAt, t.locale) })}</p>}
          <p className="mt-1 text-sm">
            {estimate.state === "PENDING" && (pro
              ? t("jobDetail.paymentPendingZgjoiWill")
              : t("jobDetail.paidUpfrontDuringBeta"))}
            {estimate.state === "PAID" && (pro
              ? t("jobDetail.paidIfCustomerHires", { amount: money(estimate.amountCents, t.locale), amount2: money(estimate.proShareCents ?? ESTIMATE_PRO_SHARE_CENTS, t.locale), amount3: money(estimate.platformShareCents ?? ESTIMATE_PLATFORM_SHARE_CENTS, t.locale) })
              : t("jobDetail.paidIfHirePro", { amount: money(estimate.amountCents, t.locale), amount2: money(estimate.proShareCents ?? ESTIMATE_PRO_SHARE_CENTS, t.locale), amount3: money(estimate.platformShareCents ?? ESTIMATE_PLATFORM_SHARE_CENTS, t.locale) }))}
            {estimate.state === "CREDITED" && t("jobDetail.wasDeductedFromJob", { amount: money(estimate.amountCents, t.locale) })}
            {estimate.state === "CANCELLED" && t("jobDetail.estimateRequestWasCancelled")}
            {estimate.state === "REFUNDED" && t("jobDetail.estimateWasRefunded")}
          </p>
          {!pro && estimate.state === "PENDING" && (
            <div className="mt-3"><ApiForm endpoint={`/api/estimates/${estimate.id}`} values={{ action: "CANCEL" }} label={t("jobDetail.cancelRequest")}
              confirmation={t("jobDetail.cancelEstimateRequestChat")} /></div>
          )}
          <time className="mt-2 block text-xs text-muted">{dateTime(estimate.createdAt, t.locale)}</time>
        </article>
      ),
    }] : []),
    // A Book now job shows its booking card instead of a quote card.
    ...(request.booking
      ? bookingEvents(request.booking, { pro, requestId: id, active: ["BOOKED", "IN_PROGRESS"].includes(request.state), t })
      : request.quotes.map(quoteCard)),
    ...statusLine("OFFER_ACCEPTED", request.acceptedQuote?.acceptedAt),
    ...statusLine(request.payment?.provider === "offline" ? "PAYMENT_MARKED_PAID_OFFLINE" : "PAYMENT_HELD", request.payment?.heldAt),
    ...statusLine("START", started?.createdAt),
    ...statusLine("REQUEST_COMPLETION", request.completionRequestedAt),
    ...statusLine("CONFIRM_COMPLETION", request.completedAt),
    ...statusLine("DISPUTE_OPENED", request.payment?.dispute?.createdAt),
    ...statusLine("DISPUTE_RESPONDED", request.payment?.dispute?.respondedAt),
    ...(request.payment?.dispute?.resolvedAt && request.payment.dispute.outcome
      ? [{
          id: "status-DISPUTE_DECIDED",
          createdAt: request.payment.dispute.resolvedAt.toISOString(),
          node: (
            <p role="status" className="mx-auto w-fit max-w-full rounded-full border border-gold/40 bg-white px-4 py-2 text-center text-xs font-semibold">
              {[
                t("jobDetail.adminDecision", { value: outcomeLabels[request.payment.dispute.outcome as DisputeOutcome] ?? request.payment.dispute.outcome }),
                request.payment.dispute.refundCents > 0 ? `rimbursim ${money(request.payment.dispute.refundCents, t.locale)}` : "",
                request.payment.dispute.customerCreditCents > 0 ? `kredi ${money(request.payment.dispute.customerCreditCents, t.locale)}` : "",
                request.payment.dispute.finalPriceCents ? t("jobDetail.finalPrice", { amount: money(request.payment.dispute.finalPriceCents, t.locale) }) : "",
                dateTime(request.payment.dispute.resolvedAt, t.locale),
              ].filter(Boolean).join(" · ")}
            </p>
          ),
        }]
      : []),
    ...statusLine("CANCEL", request.cancelledAt),
  ];
  return (
    <Frame
      actor={actor}
      title={t("jobDetail.chat", { counterpart: counterpart })}
      subtitle={`${category} · ${request.city} · ${t.tx(request.title)}`}
    >
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t("jobDetail.jobStatus")}</h2>
          <ol aria-label={t("jobDetail.jobStatus")} className="flex flex-wrap gap-2">
            {status.cancelled ? (
              <li className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800" aria-current="step">{t("jobDetail.cancelled")}</li>
            ) : (
              jobStages.map((stage, index) => (
                <li
                  key={stage.key}
                  aria-current={index === status.reached ? "step" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${index <= status.reached ? "bg-honey font-semibold text-ink" : "bg-cream text-muted"}`}
                >
                  <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5">
                    <path d="M12 2 21 7v10l-9 5-9-5V7z" className={index <= status.reached ? "fill-gold" : "fill-none stroke-current"} strokeWidth="2" />
                  </svg>
                  {t.tx(stage.label)}
                </li>
              ))
            )}
          </ol>
        </div>
        {status.reached < 0 && !status.cancelled && (
          <p className="mt-3 text-sm text-muted">
            {pro
              ? t("jobDetail.chatCustomerSendPriced")
              : t("jobDetail.chatProWhenThey")}
          </p>
        )}
        {status.disputed && <p className="mt-3 text-sm">{t("jobDetail.jobBeingReviewedZgjoi")}</p>}
        {request.state === "BOOKED" && request.acceptedQuote?.scheduledAt && (
          <p className="mt-3 rounded-xl bg-cream p-3 text-sm">
            {t("jobDetail.confirmedTimeKosovoTime", { date: dateTime(request.acceptedQuote.scheduledAt, t.locale) })}{latest && t("jobDetail.timeStaysBookedUntil")}
          </p>
        )}
        {request.booking && (
          <div className="mt-4">
            <BookingPanel b={request.booking} pro={pro} requestId={id} requestState={request.state} version={request.version}
              paidCents={request.payment?.state === "HELD" ? request.booking.dueCents : 0} whatsapp={whatsapp}
              series={series} proposal={proposal} categorySlug={request.categorySlug} />
          </div>
        )}
        {request.conversation && (
          <div className="mt-4">
            <Thread
              key={request.conversation.id}
              id={request.conversation.id}
              closed={closed}
              events={events}
              placeholder={pro ? t("jobDetail.writeCustomer") : t("jobDetail.writeTo", { name: counterpart })}
            />
          </div>
        )}
        {commissionError && <p className="mt-4 rounded-xl bg-cream p-3" role="alert">{commissionError}</p>}
        {pro && commission && ["OPEN", "QUOTED"].includes(request.state) && (
          <details className="mt-4 rounded-2xl border border-gold bg-white p-4" open={!request.quotes.length}>
            <summary className="cursor-pointer font-semibold">
              {request.quotes.length ? t("jobDetail.sendNewOffer") : t("jobDetail.sendPricedOffer")}
            </summary>
            <p className="my-3 text-sm text-muted">
              {t("jobDetail.offerAppearsChatCard", { value: commission.bps / 100 })}</p>
            <ApiForm
              key={request.version}
              endpoint="/api/offers"
              idempotent
              values={{ requestId: id, expectedVersion: request.version }}
              label={t("jobDetail.sendOfferChat")}
              fields={[
                { name: "amount", label: t("jobDetail.totalPriceEuros"), type: "number", min: 0.01, max: 100000, step: "0.01", required: true },
                { name: "description", label: t("jobDetail.noteOptional"), type: "textarea", maxLength: 4000, hint: t("jobDetail.eGWhatPrice") },
                { name: "scheduledAt", label: t("jobDetail.startDateTimeOptional"), type: "datetime-local", kosovoTime: true, hint: t("jobDetail.ifSetTimeBooked") },
                { name: "duration", label: t("jobDetail.durationMinutesIfSet"), type: "number", min: 1, max: 43200, step: "1", hint: t("jobDetail.eG120Two") },
                { name: "expiresInHours", label: t("jobDetail.offerValid"), type: "select", as: "number", required: true, value: "72",
                  options: [{ value: "24", label: t("jobDetail.n24Hours") }, { value: "72", label: t("jobDetail.n3Days") }, { value: "168", label: t("jobDetail.n7Days") }] },
              ]}
            />
          </details>
        )}
        {pro && request.state === "BOOKED" && request.unpaidEditable && request.acceptedQuote?.scheduledAt && (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">{t("jobDetail.proposeAnotherTime")}</summary>
            <p className="my-3 text-sm text-muted">{t("jobDetail.customerHasAcceptChange")}</p>
            <ApiForm key={`reschedule-${request.version}`} endpoint={`/api/requests/${id}/reschedule`} idempotent
              values={{ action: "PROPOSE", expectedVersion: request.version }} label={t("jobDetail.sendTimeProposal")}
              fields={[
                { name: "timing", label: t("jobDetail.descriptionNewTime"), required: true, minLength: 3, maxLength: 120 },
                { name: "expiresAt", label: t("jobDetail.proposalExpiresKosovoTime"), type: "datetime-local", kosovoTime: true, required: true, hint: t("jobDetail.within30DaysBefore") },
                { name: "scheduledAt", label: t("jobDetail.newStartKosovoTime"), type: "datetime-local", kosovoTime: true, required: true },
              ]} />
          </details>
        )}
        {funded && active && !request.payment?.dispute && (
          <div className="mt-4 rounded-2xl bg-cream p-4">
            <h3 className="mb-3 font-bold">{t("jobDetail.jobProgress")}</h3>
            {pro ? (
              <div className="flex flex-wrap gap-3">
                {request.state === "BOOKED" && jobAction("START", t("jobDetail.startJob"))}
                {!request.completionRequestedAt &&
                  jobAction("REQUEST_COMPLETION", t("jobDetail.askCustomerConfirm"), t("jobDetail.jobFinishedReadyConfirm"))}
                {request.completionRequestedAt && <p>{t("jobDetail.customerHasBeenAsked")}</p>}
              </div>
            ) : (
              <>
                {request.completionRequestedAt && <p className="mb-3">{t("jobDetail.proHasMarkedJob")}</p>}
                {jobAction(
                  "CONFIRM_COMPLETION",
                  t("jobDetail.confirmCompletion"),
                  t("jobDetail.confirmJobWasFinished"),
                )}
              </>
            )}
          </div>
        )}
      </Panel>
      {request.payment && (
        <Panel>
          <h2 className="text-lg font-bold">
            {t("jobDetail.payment", { label: t.tx(stateLabel(request.payment.state)) })}</h2>
          <p className="mt-2">{t("jobDetail.total", { amount: money(request.payment.amount, t.locale) })}</p>
          {request.payment.estimateCreditCents > 0 && (
            <p className="mt-1 text-sm">
              {t("jobDetail.paidEstimateCreditPay", { amount: money(Math.min(request.payment.estimateCreditCents, request.payment.amount), t.locale) })}{" "}
              {money(Math.max(0, request.payment.amount - request.payment.estimateCreditCents), t.locale)}
            </p>
          )}
          {pro && (
            <p className="mt-1 text-sm">
              {t("jobDetail.commission", { value: request.payment.commissionBps / 100, amount: money(request.payment.commissionAmount, t.locale) })}{" "}
              {money(request.payment.proAmount, t.locale)}
            </p>
          )}
          {request.payment.state === "PENDING" && request.state === "BOOKED" && (
            <div className="mt-4">
              {latest ? (
                <p>{pro ? t("jobDetail.waitingCustomerDecideNew") : t("jobDetail.acceptDeclineTimeProposal")}</p>
              ) : pro ? (
                <p>
                  {t("jobDetail.waitPaymentConfirmationBefore")}{!paymentsReady() && t("jobDetail.duringBetaZgjoiTeam")}
                </p>
              ) : paymentsReady() ? (
                <>
                  <p className="mb-3 text-sm">
                    {t("jobDetail.testEnvironmentUseTest")}</p>
                  <ApiForm
                    endpoint="/api/payments/checkout"
                    values={{ requestId: id }}
                    label={t("jobDetail.continueTestPayment")}
                  />
                </>
              ) : (
                <p role="status">
                  {t("jobDetail.onlinePaymentsArentAvailable")}</p>
              )}
            </div>
          )}
          {request.state === "CANCELLED" && request.payment.state === "EXPIRED" && (
            <p className="mt-3 text-sm">{t("jobDetail.bookingWasCancelledBefore")}</p>
          )}
          {funded && (
            <p className="mt-3 text-sm">
              {request.payment.provider === "offline"
                ? t("jobDetail.paymentConfirmedZgjoiTeam")
                : t("jobDetail.paymentConfirmedFundsCan")}
            </p>
          )}
          {request.payment.dispute && (() => {
            const d = request.payment.dispute;
            const mineOpened = d.openedByRole ? (d.openedByRole === "PRO") === pro : !pro;
            const canRespond = !d.resolvedAt && !mineOpened && !d.response && (!d.respondBy || d.respondBy > new Date());
            return (
              <div className="mt-3 space-y-3 rounded-xl bg-cream p-3">
                <h3 className="font-bold">{t("jobDetail.dispute")}</h3>
                <div>
                  <p className="text-xs font-semibold text-gold-dark">{t("jobDetail.statementFrom")}{" "}{d.openedByRole === "PRO" ? "profesionistit" : "klientit"}{mineOpened ? " (ju)" : ""}</p>
                  <p className="whitespace-pre-wrap text-sm">{d.reason}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gold-dark">{t("jobDetail.statementFrom")}{" "}{d.openedByRole === "PRO" ? "klientit" : "profesionistit"}{!mineOpened ? " (ju)" : ""}</p>
                  <p className="whitespace-pre-wrap text-sm">
                    {d.response ?? (d.respondBy && d.respondBy > new Date() ? t("jobDetail.waitingUntil", { date: dateTime(d.respondBy, t.locale) }) : t("jobDetail.notAddedBeforeDeadline"))}
                  </p>
                </div>
                {canRespond && (
                  <ApiForm endpoint="/api/disputes" values={{ action: "RESPOND", requestId: id }} label={t("jobDetail.addStatement")}
                    fields={[{ name: "statement", label: t("jobDetail.replyWithinHours", { DISPUTE_RESPONSE_HOURS: DISPUTE_RESPONSE_HOURS }), type: "textarea", minLength: 20, maxLength: 4000, required: true }]} />
                )}
                <p className="text-sm">
                  {d.resolvedAt
                    ? `${t.tx(outcomeLabels[d.outcome as DisputeOutcome]) ?? d.outcome}${d.resolution ? ` — ${d.resolution}` : ""}`
                    : t("jobDetail.underReviewAdminTeam")}
                </p>
              </div>
            );
          })()}
        </Panel>
      )}
      {funded && !request.payment?.dispute && canOpenDispute(request, new Date()) && (
        <Panel>
          <details>
            <summary className="cursor-pointer font-semibold">
              {t("jobDetail.reportProblemJob")}</summary>
            <p className="mt-2 text-sm text-muted">
              {t("jobDetail.otherPartyHasHours", { DISPUTE_RESPONSE_HOURS: DISPUTE_RESPONSE_HOURS, DISPUTE_OPEN_DAYS: DISPUTE_OPEN_DAYS })}</p>
            <div className="mt-4">
              <ApiForm
                endpoint="/api/disputes"
                values={{ requestId: id }}
                label={t("jobDetail.openDispute")}
                fields={[
                  {
                    name: "reason",
                    label: t("jobDetail.describeProblem"),
                    type: "textarea",
                    minLength: 20,
                    maxLength: 4000,
                    required: true,
                  },
                ]}
              />
            </div>
          </details>
        </Panel>
      )}
      {!pro && request.state === "COMPLETED" && request.payment &&
        ["HELD", "RELEASED"].includes(request.payment.state) && !request.payment.dispute && (
        <Panel>
          <h2 className="mb-3 text-lg font-bold">{t("jobDetail.repeatService")}</h2>
          <p className="mb-4 text-sm text-muted">{t("jobDetail.requestFollowUpVisit")}</p>
          <ApiForm endpoint={`/api/requests/${id}/recurrence`} label={t("jobDetail.requestFollowUpVisit2")}
            fields={[{ name: "cadence", label: t("jobDetail.frequency"), type: "select", required: true,
              options: Object.entries(recurrenceLabels).map(([value, label]) => ({ value, label })) }]} />
        </Panel>
      )}
      {!pro && request.state === "COMPLETED" && (
        <Panel>
          <h2 className="mb-4 text-lg font-bold">{t("jobDetail.review")}</h2>
          {request.review ? (
            <>
              <p>{request.review.rating}/5</p>
              <p>{request.review.text}</p>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                {t("jobDetail.reviewsOptionalJobsCompletion")}</p>
              <ApiForm
                endpoint="/api/reviews"
                values={{ requestId: id }}
                label={t("jobDetail.publishReview")}
                fields={[
                  {
                    name: "rating",
                    label: t("jobDetail.rating"),
                    type: "select",
                    as: "number",
                    required: true,
                    options: [5, 4, 3, 2, 1].map((value) => ({
                      value: String(value),
                      label: `${value}/5`,
                    })),
                  },
                  {
                    name: "text",
                    label: t("jobDetail.experience"),
                    type: "textarea",
                    minLength: 15,
                    maxLength: 2000,
                    required: true,
                  },
                ]}
              />
            </>
          )}
        </Panel>
      )}
      {request.unpaidEditable && (
        <Panel>
          {jobAction(
            "CANCEL",
            request.state === "BOOKED" ? t("jobDetail.cancelBookingFreeCharge") : t("jobDetail.closeChat"),
            request.state === "BOOKED"
              ? t("jobDetail.cancelBookingFreeCharge2")
              : t("jobDetail.closeChatOpenOffers"),
          )}
        </Panel>
      )}
    </Frame>
  );
}
