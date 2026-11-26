import { money, dateTime } from "@/lib/format";
import { cancellationOutcome, hourOptions, hoursLabel, bookingTotal, isLate, MINUTE_STEP, type CancelReason } from "@/lib/book-now";
import ApiForm from "./ApiForm";
import type { ThreadEvent } from "./Thread";

export type BookingView = {
  id: string; startsAt: Date; hourlyRateCents: number; minMinutes: number; minutes: number; totalCents: number;
  commissionBps: number; commissionCents: number; proCents: number; creditCents: number; dueCents: number;
  status: string; cancelledAt: Date | null; cancelledBy: string | null; cancelReason: string | null;
  feeCents: number; feeProCents: number; feePlatformCents: number; refundCents: number; createdAt: Date;
  changes: { id: string; kind: string; state: string; minutes: number | null; totalCents: number | null; note: string | null;
    todoKind: string | null; todoCents: number | null; todoDoneAt: Date | null; decidedAt: Date | null; createdAt: Date }[];
};
const changeState: Record<string, string> = { PROPOSED: "Në pritje të konfirmimit", CONFIRMED: "Konfirmuar", DECLINED: "Refuzuar", SUPERSEDED: "Zëvendësuar" };

/** Chat items for a Book now job: the booking card, hour-change cards and the cancellation line. */
export function bookingEvents(b: BookingView, opts: { pro: boolean; requestId: string; active: boolean }): ThreadEvent[] {
  const side = opts.pro ? "mr-auto" : "ml-auto";
  const items: ThreadEvent[] = [{
    id: `booking-${b.id}`, createdAt: b.createdAt.toISOString(),
    node: (
      <article aria-label="Rezervimi" className={`max-w-[92%] rounded-2xl border-2 border-gold bg-white p-4 shadow-soft sm:max-w-md ${side}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Rezervo tani · me orë</p>
          <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">{b.status === "CANCELLED" ? "Anuluar" : "Rezervuar"}</span>
        </div>
        <p className="mt-2 text-sm">{hoursLabel(b.minutes)} × {money(b.hourlyRateCents)}/orë</p>
        <p className="text-2xl font-bold">{money(b.totalCents)}</p>
        {b.creditCents > 0 && <p className="mt-1 text-sm">Kredi nga vlerësimi: −{money(Math.min(b.creditCents, b.totalCents))} · Për t’u paguar: {money(b.dueCents)}</p>}
        <p className="mt-1 text-sm">Fillimi: {dateTime(b.startsAt)} (ora e Kosovës)</p>
        <p className="mt-1 text-xs text-muted">Paguhet paraprakisht · minimumi {hoursLabel(b.minMinutes)}</p>
        <time className="mt-2 block text-xs text-muted">{dateTime(b.createdAt)}</time>
      </article>
    ),
  }];
  for (const c of b.changes) {
    if (c.kind === "HOURS" && c.minutes && c.totalCents) items.push({
      id: `hours-${c.id}`, createdAt: c.createdAt.toISOString(),
      node: (
        <article aria-label="Ndryshim i orëve" className={`max-w-[92%] rounded-2xl border-2 bg-white p-4 shadow-soft sm:max-w-md ${opts.pro ? "ml-auto" : "mr-auto"} ${c.state === "PROPOSED" ? "border-gold" : "border-line"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Propozim për orët</p>
            <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">{changeState[c.state] ?? c.state}</span>
          </div>
          <p className="mt-2 text-sm">{hoursLabel(c.minutes)} × {money(b.hourlyRateCents)}/orë</p>
          <p className="text-2xl font-bold">{money(c.totalCents)}</p>
          {c.note && <p className="mt-1 whitespace-pre-wrap text-sm">{c.note}</p>}
          {c.state === "PROPOSED" && <p className="mt-1 text-xs text-muted">Derisa klienti ta konfirmojë, vlen totali i mëparshëm.</p>}
          {!opts.pro && c.state === "PROPOSED" && opts.active && (
            <div className="mt-3 flex flex-wrap gap-3">
              <ApiForm endpoint={`/api/bookings/${opts.requestId}`} values={{ action: "CONFIRM_HOURS", changeId: c.id }} label="Konfirmo orët"
                confirmation={`Konfirmoni ${hoursLabel(c.minutes)} me total ${money(c.totalCents)}?`} />
              <ApiForm endpoint={`/api/bookings/${opts.requestId}`} values={{ action: "DECLINE_HOURS", changeId: c.id }} label="Mbaj totalin fillestar" />
            </div>
          )}
          <time className="mt-2 block text-xs text-muted">{dateTime(c.createdAt)}</time>
        </article>
      ),
    });
    if (c.kind === "CANCELLATION") items.push({
      id: `cancel-${c.id}`, createdAt: c.createdAt.toISOString(),
      node: <p role="status" className="mx-auto w-fit max-w-full rounded-full border border-gold/40 bg-white px-4 py-2 text-center text-xs font-semibold">{c.note} · {dateTime(c.createdAt)}</p>,
    });
  }
  return items;
}

/** Terms in force, history, the pro's hour-change form and the cancellation buttons. */
export function BookingPanel({ b, pro, requestId, requestState, version, paidCents }: {
  b: BookingView; pro: boolean; requestId: string; requestState: string; version: number; paidCents: number;
}) {
  const now = new Date();
  // The booking row already holds the confirmed terms; proposals never count until confirmed.
  const terms = { minutes: b.minutes, totalCents: b.totalCents };
  const active = b.status === "CONFIRMED" && ["BOOKED", "IN_PROGRESS"].includes(requestState);
  const started = b.startsAt <= now;
  const cancel = (reason: CancelReason, label: string) => {
    const outcome = cancellationOutcome({ by: pro ? "PRO" : "CLIENT", reason, startsAt: b.startsAt, now, paidCents });
    return (
      <ApiForm key={reason} endpoint={`/api/bookings/${requestId}`} values={{ action: reason, expectedVersion: version }} label={label}
        confirmation={`${outcome.label} Vazhdoni?`} />
    );
  };
  const history = b.changes.filter(c => c.kind === "CANCELLATION" || c.state !== "PROPOSED");
  return (
    <div className="rounded-2xl border border-gold/60 bg-white p-4">
      <h2 className="text-lg font-bold">Rezervimi</h2>
      <p className="mt-1 text-sm">
        {hoursLabel(terms.minutes)} × {money(b.hourlyRateCents)}/orë = <strong>{money(terms.totalCents)}</strong> · fillimi {dateTime(b.startsAt)}
      </p>
      {b.creditCents > 0 && <p className="text-sm">Kredi nga vlerësimi {money(b.creditCents)} · për t’u paguar {money(b.dueCents)}</p>}
      {pro && <p className="text-sm text-muted">Komisioni ({b.commissionBps / 100}%): {money(b.commissionCents)} · për ju {money(b.proCents + Math.max(0, b.creditCents - b.totalCents))}. Gjatë beta-s komisioni regjistrohet, nuk mblidhet.</p>}
      {b.status === "CANCELLED" && (
        <p className="mt-2 rounded-xl bg-cream p-3 text-sm" role="status">
          Anuluar {b.cancelledAt ? dateTime(b.cancelledAt) : ""}.
          {b.feeCents > 0 && ` Tarifa: ${money(b.feeCents)} (${money(b.feeProCents)} profesionisti, ${money(b.feePlatformCents)} Zgjoi).`}
          {` Rimbursim: ${money(b.refundCents)}.`} Gjatë beta-s rimbursimin e kryen ekipi i Zgjoi.
        </p>
      )}
      {pro && active && (
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold">Propozo ndryshim të orëve</summary>
          <p className="my-2 text-sm text-muted">Klienti e konfirmon në bisedë. Derisa ta konfirmojë, vlen totali aktual.</p>
          <ApiForm key={`hours-${version}`} endpoint={`/api/bookings/${requestId}`} idempotent values={{ action: "PROPOSE_HOURS" }} label="Dërgo propozimin"
            fields={[
              { name: "minutes", label: "Orët e reja", type: "select", as: "number", required: true, value: String(b.minutes),
                options: hourOptions(MINUTE_STEP).map(m => ({ value: String(m), label: `${hoursLabel(m)} · ${money(bookingTotal(b.hourlyRateCents, m))}` })) },
              { name: "note", label: "Arsyeja (opsionale)", type: "textarea", maxLength: 500 },
            ]} />
        </details>
      )}
      {requestState === "BOOKED" && b.status === "CONFIRMED" && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted">
            {started ? "Ora e fillimit ka kaluar." : isLate(b.startsAt, now)
              ? (pro ? "Brenda 24 orëve: nëse anuloni, klienti rimbursohet plotësisht dhe ju nuk merrni asgjë." : "Brenda 24 orëve: anulimi ka tarifë fikse 15 €.")
              : "Anulimi është falas deri 24 orë para fillimit."}
          </p>
          <div className="flex flex-wrap gap-3">
            {!started && cancel("CANCEL", "Anulo rezervimin")}
            {started && !pro && cancel("NO_SHOW", "Profesionisti nuk erdhi")}
            {started && pro && cancel("NOBODY_HOME", "Nuk kishte askënd në shtëpi")}
          </div>
        </div>
      )}
      {history.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold">Historiku i rezervimit</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {history.map(c => (
              <li key={c.id}>
                {dateTime(c.createdAt)} · {c.kind === "HOURS" ? `Orët: ${hoursLabel(c.minutes ?? 0)} (${money(c.totalCents ?? 0)}) · ${changeState[c.state] ?? c.state}` : c.note}
                {c.todoKind && ` · ${c.todoKind === "REFUND" ? "Rimbursim" : "Për t’u mbledhur"} ${money(c.todoCents ?? 0)} ${c.todoDoneAt ? "(kryer)" : "(në pritje te Zgjoi)"}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
