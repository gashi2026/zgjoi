import { msgKey, type T } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/messages/sq";
import { money, dateTime } from "@/lib/format";
import { cancellationOutcome, hourOptions, hoursLabel, bookingTotal, isLate, MINUTE_STEP, type CancelReason } from "@/lib/book-now";
import ApiForm from "./ApiForm";
import ArrivalPanel, { WaitCountdown } from "./ArrivalPanel";
import { checkInWindow, contactLabels, customerArrivalLine, nobodyHomeGate, noShowGate, NO_SHOW_AFTER_MINUTES, type ContactResult } from "@/lib/arrival";
import { clockTime } from "@/lib/format";
import type { ThreadEvent } from "./Thread";
import Link from "@/components/i18n/Link";
import { SERIES_CADENCES, cadenceOptionLabels, seriesLabel, seriesStatusLabels, seriesCommissionBps } from "@/lib/recurring-series";
import { getT } from "@/lib/i18n/server";

export type SeriesLite = { id: string; cadence: string; weekday: number; monthDay?: number | null; startMinute: number; status: string; minutes: number;
  hourlyRateCents: number; firstStartsAt: Date; categorySlug: string; proposedBy: string };

export type BookingView = {
  id: string; startsAt: Date; hourlyRateCents: number; minMinutes: number; minutes: number; totalCents: number;
  commissionBps: number; commissionCents: number; proCents: number; creditCents: number; dueCents: number;
  status: string; cancelledAt: Date | null; cancelledBy: string | null; cancelReason: string | null;
  feeCents: number; feeProCents: number; feePlatformCents: number; refundCents: number; createdAt: Date;
  changes: { id: string; kind: string; state: string; minutes: number | null; totalCents: number | null; note: string | null;
    todoKind: string | null; todoCents: number | null; todoDoneAt: Date | null; decidedAt: Date | null; createdAt: Date }[];
  siteGeocode?: string | null;
  arrival?: { checkedInAt: Date; distanceM: number | null; method: string; helplineAt: Date | null; waitEndsAt: Date | null; contactResult: string | null } | null;
};
const changeState: Record<string, string> = { PROPOSED: msgKey("bookingPanel.awaitingConfirmation"), CONFIRMED: msgKey("bookingPanel.confirmed"), DECLINED: msgKey("bookingPanel.declined"), SUPERSEDED: msgKey("bookingPanel.replaced") };

/** Chat items for a Book now job: the booking card, hour-change cards and the cancellation line. */
export function bookingEvents(b: BookingView, opts: { pro: boolean; requestId: string; active: boolean; t: T }): ThreadEvent[] {
  const t = opts.t;
  const side = opts.pro ? "mr-auto" : "ml-auto";
  const items: ThreadEvent[] = [{
    id: `booking-${b.id}`, createdAt: b.createdAt.toISOString(),
    node: (
      <article aria-label={t("bookingPanel.booking")} className={`max-w-[92%] rounded-2xl border-2 border-gold bg-white p-4 shadow-soft sm:max-w-md ${side}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{t("bookingPanel.bookNowHourly")}</p>
          <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">{b.status === "CANCELLED" ? t("bookingPanel.cancelled") : t("bookingPanel.booked")}</span>
        </div>
        <p className="mt-2 text-sm">{t("bookingPanel.hr2", { label: t.tx(hoursLabel(b.minutes)), amount: money(b.hourlyRateCents, t.locale) })}</p>
        <p className="text-2xl font-bold">{money(b.totalCents, t.locale)}</p>
        {b.creditCents > 0 && <p className="mt-1 text-sm">{t("bookingPanel.estimateCreditPay2", { amount: money(Math.min(b.creditCents, b.totalCents), t.locale), amount2: money(b.dueCents, t.locale) })}</p>}
        <p className="mt-1 text-sm">{t("bookingPanel.startKosovoTime", { date: dateTime(b.startsAt, t.locale) })}</p>
        <p className="mt-1 text-xs text-muted">{t("bookingPanel.paidUpfrontMinimum", { label: t.tx(hoursLabel(b.minMinutes)) })}</p>
        <time className="mt-2 block text-xs text-muted">{dateTime(b.createdAt, t.locale)}</time>
      </article>
    ),
  }];
  const line = (id: string, at: Date, text: string) => items.push({ id, createdAt: at.toISOString(),
    node: <p role="status" className="mx-auto w-fit max-w-full rounded-full border border-gold/40 bg-white px-4 py-2 text-center text-xs font-semibold">{text}</p> });
  if (b.arrival) line(`arrival-${b.id}`, b.arrival.checkedInAt, t.tx(customerArrivalLine(b.arrival)));
  if (b.arrival?.helplineAt) line(`helpline-${b.id}`, b.arrival.helplineAt, t("bookingPanel.proWaitingAddressZgjoi", { time: clockTime(b.arrival.helplineAt, t.locale) }));
  for (const c of b.changes) {
    if (c.kind === "HOURS" && c.minutes && c.totalCents) items.push({
      id: `hours-${c.id}`, createdAt: c.createdAt.toISOString(),
      node: (
        <article aria-label={t("bookingPanel.hoursChange")} className={`max-w-[92%] rounded-2xl border-2 bg-white p-4 shadow-soft sm:max-w-md ${opts.pro ? "ml-auto" : "mr-auto"} ${c.state === "PROPOSED" ? "border-gold" : "border-line"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{t("bookingPanel.proposedHours")}</p>
            <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">{changeState[c.state] ? t(changeState[c.state] as MessageKey) : c.state}</span>
          </div>
          <p className="mt-2 text-sm">{t("bookingPanel.hr2", { label: t.tx(hoursLabel(c.minutes)), amount: money(b.hourlyRateCents, t.locale) })}</p>
          <p className="text-2xl font-bold">{money(c.totalCents, t.locale)}</p>
          {c.note && <p className="mt-1 whitespace-pre-wrap text-sm">{c.note}</p>}
          {c.state === "PROPOSED" && <p className="mt-1 text-xs text-muted">{t("bookingPanel.untilCustomerConfirmsPrevious")}</p>}
          {!opts.pro && c.state === "PROPOSED" && opts.active && (
            <div className="mt-3 flex flex-wrap gap-3">
              <ApiForm endpoint={`/api/bookings/${opts.requestId}`} values={{ action: "CONFIRM_HOURS", changeId: c.id }} label={t("bookingPanel.confirmHours")}
                confirmation={t("bookingPanel.confirmTotal", { label: t.tx(hoursLabel(c.minutes)), amount: money(c.totalCents, t.locale) })} />
              <ApiForm endpoint={`/api/bookings/${opts.requestId}`} values={{ action: "DECLINE_HOURS", changeId: c.id }} label={t("bookingPanel.keepOriginalTotal")} />
            </div>
          )}
          <time className="mt-2 block text-xs text-muted">{dateTime(c.createdAt, t.locale)}</time>
        </article>
      ),
    });
    if (c.kind === "CANCELLATION") items.push({
      id: `cancel-${c.id}`, createdAt: c.createdAt.toISOString(),
      node: <p role="status" className="mx-auto w-fit max-w-full rounded-full border border-gold/40 bg-white px-4 py-2 text-center text-xs font-semibold">{c.note} · {dateTime(c.createdAt, t.locale)}</p>,
    });
  }
  return items;
}

/** Terms in force, history, the pro's hour-change form and the cancellation buttons. */
export async function BookingPanel({ b, pro, requestId, requestState, version, paidCents, whatsapp = null, series = null, proposal = null, categorySlug }: {
  b: BookingView; pro: boolean; requestId: string; requestState: string; version: number; paidCents: number; whatsapp?: string | null;
  series?: SeriesLite | null; proposal?: SeriesLite | null; categorySlug: string;
}) {
  const t = await getT();
  const now = new Date();
  // The booking row already holds the confirmed terms; proposals never count until confirmed.
  const terms = { minutes: b.minutes, totalCents: b.totalCents };
  const active = b.status === "CONFIRMED" && ["BOOKED", "IN_PROGRESS"].includes(requestState);
  const started = b.startsAt <= now;
  const cancel = (reason: CancelReason, label: string) => {
    const outcome = cancellationOutcome({ by: pro ? "PRO" : "CLIENT", reason, startsAt: b.startsAt, now, paidCents });
    return (
      <ApiForm key={reason} endpoint={`/api/bookings/${requestId}`} values={{ action: reason, expectedVersion: version }} label={label}
        confirmation={t("bookingPanel.continue", { label: outcome.label })} />
    );
  };
  const history = b.changes.filter(c => c.kind === "CANCELLATION" || c.state !== "PROPOSED");
  const arrival = b.arrival ?? null;
  const noShow = noShowGate(b.startsAt, arrival, now);
  const nobodyHome = nobodyHomeGate(arrival, now);
  const open = b.status === "CONFIRMED" && requestState === "BOOKED";
  const waiting = arrival?.waitEndsAt && arrival.waitEndsAt > now;
  return (
    <div className="rounded-2xl border border-gold/60 bg-white p-4">
      <h2 className="text-lg font-bold">{t("bookingPanel.booking")}</h2>
      <p className="mt-1 text-sm">
        {t("bookingPanel.hr", { label: t.tx(hoursLabel(terms.minutes)), amount: money(b.hourlyRateCents, t.locale) })}{" "}<strong>{money(terms.totalCents, t.locale)}</strong> {" "}{t("bookingPanel.starts", { date: dateTime(b.startsAt, t.locale) })}</p>
      {b.creditCents > 0 && <p className="text-sm">{t("bookingPanel.estimateCreditPay", { amount: money(b.creditCents, t.locale), amount2: money(b.dueCents, t.locale) })}</p>}
      <RecurringBlock b={b} pro={pro} requestId={requestId} requestState={requestState} series={series} proposal={proposal} categorySlug={categorySlug} />
      {pro && <p className="text-sm text-muted">{t("bookingPanel.commissionDuringBetaCommission", { value: b.commissionBps / 100, amount: money(b.commissionCents, t.locale), amount2: money(b.proCents + Math.max(0, b.creditCents - b.totalCents), t.locale) })}</p>}
      {b.status === "CANCELLED" && (
        <p className="mt-2 rounded-xl bg-cream p-3 text-sm" role="status">
          {t("bookingPanel.cancelled")}{" "}{b.cancelledAt ? dateTime(b.cancelledAt, t.locale) : ""}.
          {b.feeCents > 0 && t("bookingPanel.cancelFee", { fee: money(b.feeCents, t.locale), pro: money(b.feeProCents, t.locale), platform: money(b.feePlatformCents, t.locale) })}
          {t("bookingPanel.refundAmount", { amount: money(b.refundCents, t.locale) })} {" "}{t("bookingPanel.duringBetaZgjoiTeam")}</p>
      )}
      {pro && open && (arrival || checkInWindow(b.startsAt, now) !== "CLOSED") && (
        <ArrivalPanel requestId={requestId} startsAt={b.startsAt.toISOString()} whatsapp={arrival ? whatsapp : null}
          canCheckIn={checkInWindow(b.startsAt, now) === "OPEN"}
          contactLabel={arrival?.contactResult ? t.tx(t.tx(contactLabels[arrival.contactResult as ContactResult])) ?? null : null}
          arrival={arrival && { checkedInAt: arrival.checkedInAt.toISOString(), distanceM: arrival.distanceM, method: arrival.method,
            helplineAt: arrival.helplineAt?.toISOString() ?? null, waitEndsAt: arrival.waitEndsAt?.toISOString() ?? null, contactResult: arrival.contactResult }} />
      )}
      {!pro && arrival && open && (
        <p role="status" className="mt-3 rounded-xl bg-honey/60 p-3 text-sm font-semibold">
          {waiting && arrival.waitEndsAt
            ? <WaitCountdown endsAt={arrival.waitEndsAt.toISOString()} template={t("bookingPanel.proWaitingMin")} done={t.tx(customerArrivalLine(arrival))} />
            : t.tx(customerArrivalLine(arrival))}
        </p>
      )}
      {pro && active && (
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold">{t("bookingPanel.proposeChangeHours")}</summary>
          <p className="my-2 text-sm text-muted">{t("bookingPanel.customerConfirmsChatUntil")}</p>
          <ApiForm key={`hours-${version}`} endpoint={`/api/bookings/${requestId}`} idempotent values={{ action: "PROPOSE_HOURS" }} label={t("bookingPanel.sendProposal")}
            fields={[
              { name: "minutes", label: t("bookingPanel.newHours"), type: "select", as: "number", required: true, value: String(b.minutes),
                options: hourOptions(MINUTE_STEP).map(m => ({ value: String(m), label: `${t.tx(hoursLabel(m))} · ${money(bookingTotal(b.hourlyRateCents, m), t.locale)}` })) },
              { name: "note", label: "Arsyeja (opsionale)", type: "textarea", maxLength: 500 },
            ]} />
        </details>
      )}
      {requestState === "BOOKED" && b.status === "CONFIRMED" && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted">
            {started ? t("bookingPanel.startTimeHasPassed") : isLate(b.startsAt, now)
              ? (pro ? t("bookingPanel.within24HoursIf") : t("bookingPanel.within24HoursCancelling"))
              : t("bookingPanel.cancellingFreeUp24")}
          </p>
          <div className="flex flex-wrap gap-3">
            {!started && cancel("CANCEL", t("bookingPanel.cancelBooking"))}
            {started && !pro && noShow === "NO_SHOW" && cancel("NO_SHOW", t("bookingPanel.proDidntShowUp"))}
            {started && pro && nobodyHome.ok && cancel("NOBODY_HOME", t("bookingPanel.nobodyWasHome"))}
          </div>
          {started && !pro && noShow === "TOO_EARLY" && (
            <p className="text-xs text-muted">{t("bookingPanel.ifProDoesntCheck", { NO_SHOW_AFTER_MINUTES: NO_SHOW_AFTER_MINUTES, time: clockTime(new Date(b.startsAt.getTime() + NO_SHOW_AFTER_MINUTES * 60_000), t.locale) })}</p>
          )}
          {started && !pro && noShow === "DISPUTE" && paidCents > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold">{t("bookingPanel.proDidntShowUp2")}</summary>
              <p className="my-2 text-sm text-muted">{t("bookingPanel.proCheckedIveArrived")}</p>
              <ApiForm endpoint={`/api/bookings/${requestId}`} values={{ action: "NO_SHOW", expectedVersion: version }} label={t("bookingPanel.sendAdminTeam")}
                fields={[{ name: "statement", label: t("bookingPanel.whatHappened"), type: "textarea", required: true, minLength: 20, maxLength: 4000 }]} />
            </details>
          )}
          {started && pro && !nobodyHome.ok && b.arrival && (
            <p className="text-xs text-muted">{nobodyHome.message}</p>
          )}
        </div>
      )}
      {history.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold">{t("bookingPanel.bookingHistory")}</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {history.map(c => (
              <li key={c.id}>
                {dateTime(c.createdAt, t.locale)} · {c.kind === "HOURS" ? t("bookingPanel.hours", { label: t.tx(hoursLabel(c.minutes ?? 0)), amount: money(c.totalCents ?? 0, t.locale), value: changeState[c.state] ?? c.state }) : c.note}
                {c.todoKind && ` · ${c.todoKind === "REFUND" ? t("bookingPanel.refund") : t("bookingPanel.collected")} ${money(c.todoCents ?? 0, t.locale)} ${c.todoDoneAt ? "(kryer)" : t("bookingPanel.pendingZgjoi")}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

const seriesHref = (pro: boolean) => (pro ? "/pro/perseritjet" : "/llogaria/perseritjet");
/** Recurring schedules inside the booking card: the series this booking belongs
 * to, a pro's open proposal (customer confirms here), or the pro's propose form. */
async function RecurringBlock({ b, pro, requestId, requestState, series, proposal, categorySlug }: {
  b: BookingView; pro: boolean; requestId: string; requestState: string; series: SeriesLite | null; proposal: SeriesLite | null; categorySlug: string;
}) {
  const t = await getT();
  if (series) return (
    <p className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl bg-honey/60 px-3 py-2 text-sm">
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path d="M12 2 21 7v10l-9 5-9-5V7z" className="fill-gold" /></svg>
      <span>{t("bookingPanel.recurringBooking")}{" "}<strong>{t.tx(seriesLabel(series))}</strong> · {t.tx(t.tx(seriesStatusLabels[series.status])) ?? series.status}</span>
      <Link className="font-semibold text-gold-dark underline" href={seriesHref(pro)}>{t("bookingPanel.manage")}</Link>
    </p>
  );
  if (proposal) return (
    <div aria-label={t("bookingPanel.recurringBookingProposal")} className="mt-3 rounded-2xl border-2 border-gold bg-white p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{t("bookingPanel.proposalRecurringBooking")}</p>
      <p className="mt-1"><strong>{t.tx(seriesLabel(proposal))}</strong> {" "}{t("bookingPanel.hrPerVisit", { label: t.tx(hoursLabel(proposal.minutes)), amount: money(proposal.hourlyRateCents, t.locale), amount2: money(bookingTotal(proposal.hourlyRateCents, proposal.minutes), t.locale) })}</p>
      <p className="text-xs text-muted">{t("bookingPanel.firstVisitEachVisit", { date: dateTime(proposal.firstStartsAt, t.locale) })}</p>
      {pro
        ? <div className="mt-2 flex flex-wrap items-center gap-3"><span className="text-xs font-semibold">{t("bookingPanel.waitingCustomerConfirm")}</span>
            <ApiForm endpoint={`/api/recurring/${proposal.id}`} values={{ action: "CANCEL" }} label={t("bookingPanel.withdrawProposal")} /></div>
        : <div className="mt-2 flex flex-wrap gap-3">
            <ApiForm endpoint={`/api/recurring/${proposal.id}`} values={{ action: "CONFIRM" }} label={t("bookingPanel.confirmRecurringBooking")}
              confirmation={t("bookingPanel.confirmEachVisitPaid", { label: t.tx(seriesLabel(proposal)) })} />
            <ApiForm endpoint={`/api/recurring/${proposal.id}`} values={{ action: "DECLINE" }} label={t("bookingPanel.noThanks")} />
          </div>}
    </div>
  );
  if (pro && b.status === "CONFIRMED" && requestState !== "CANCELLED") return (
    <details className="mt-3">
      <summary className="cursor-pointer font-semibold">{t("bookingPanel.proposeRecurringBooking")}</summary>
      <p className="my-2 text-sm text-muted">
        {t("bookingPanel.sameDayTimeMonthly", { value: seriesCommissionBps(categorySlug) / 100 })}</p>
      <ApiForm endpoint={`/api/bookings/${requestId}`} idempotent values={{ action: "PROPOSE_SERIES" }} label={t("bookingPanel.sendProposal")}
        fields={[{ name: "cadence", label: t("bookingPanel.howOften"), type: "select", required: true, value: "WEEKLY",
          options: SERIES_CADENCES.map(c => ({ value: c, label: t.tx(t.tx(cadenceOptionLabels[c])) })) }]} />
    </details>
  );
  return null;
}
