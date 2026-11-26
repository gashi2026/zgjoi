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
import { appointmentEnd } from "@/lib/appointments";
import Frame, { Panel } from "./Frame";
import ApiForm from "./ApiForm";
import Thread, { type ThreadEvent } from "./Thread";
import { BookingPanel, bookingEvents } from "./BookingPanel";
import { canOpenDispute, outcomeLabels, DISPUTE_OPEN_DAYS, DISPUTE_RESPONSE_HOURS, type DisputeOutcome } from "@/lib/dispute-rules";
import { serviceCategory } from "@/lib/service-categories";
import { DEFAULT_CHAT_TIMING } from "@/lib/marketplace-validation";
import { jobStages, jobStatus, timelineEventLabel } from "@/lib/chat-timeline";
export default async function JobDetail({
  id,
  pro,
}: {
  id: string;
  pro: boolean;
}) {
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
  const counterpart = pro ? request.client.name : (request.selectedPro?.user.name ?? "Profesionisti");
  const category = serviceCategory(request.categorySlug)?.name ?? request.categorySlug;
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
    const label = timelineEventLabel(key, pro);
    return at && label
      ? [{
          id: `status-${key}`,
          createdAt: at.toISOString(),
          node: (
            <p role="status" className="mx-auto w-fit max-w-full rounded-full border border-gold/40 bg-white px-4 py-2 text-center text-xs font-semibold">
              {label} · {dateTime(at)}
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
          aria-label={`Oferta ${quote.revision}`}
          className={`max-w-[92%] rounded-2xl border-2 bg-white p-4 shadow-soft sm:max-w-md ${current || quote.state === "ACCEPTED" ? "border-gold" : "border-line"} ${side(pro)}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
              {reschedule ? "Propozim për orar të ri" : `Ofertë · Versioni ${quote.revision}`}
            </p>
            <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">
              {expired ? "Skaduar" : stateLabel(quote.state)}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold">{money(quote.amount)}</p>
          {quote.message && <p className="mt-2 whitespace-pre-wrap text-sm">{quote.message}</p>}
          {quote.availableAt && <p className="mt-2 text-sm">Orari: {quote.availableAt}</p>}
          {quote.scheduledAt ? (
            <p className="mt-1 text-sm">
              Fillimi: {dateTime(quote.scheduledAt)} (ora e Kosovës)
              {end && <> · Përfundimi i parashikuar: {dateTime(end)}</>}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Data e punës caktohet në bisedë.</p>
          )}
          {reschedule && <p className="mt-2 text-sm font-semibold">Çmimi dhe puna mbeten të njëjta.</p>}
          {quote.expiresAt && quote.state === "SENT" && (
            <p className="mt-1 text-xs text-muted">Vlen deri: {dateTime(quote.expiresAt)}</p>
          )}
          {!pro && current && request.state === "QUOTED" && (
            <div className="mt-4 flex flex-wrap gap-3">
              <ApiForm
                endpoint="/api/offers/accept"
                values={{ quoteId: quote.id, expectedVersion: request.version }}
                label="Puneso"
                confirmation={`Punësoni ${counterpart} për ${money(quote.amount)}? Puna kalon në statusin “Pranuar”. Pagesa rregullohet në hapin tjetër.`}
              />
              {jobAction("DECLINE", "Refuzo ofertën", undefined, quote.id)}
            </div>
          )}
          {pro && current && request.state === "QUOTED" && (
            <div className="mt-4">{jobAction("WITHDRAW", "Tërhiq ofertën", "Tërhiqni këtë ofertë?", quote.id)}</div>
          )}
          {request.state === "BOOKED" && request.unpaidEditable && current && (
            <div className="mt-4 flex flex-wrap gap-3">
              {(pro ? ["WITHDRAW"] : ["ACCEPT", "DECLINE"]).map(action => (
                <ApiForm key={action} endpoint={`/api/requests/${id}/reschedule`}
                  values={{ action, quoteId: quote.id, expectedVersion: request.version }}
                  label={action === "ACCEPT" ? "Prano orarin e ri" : action === "DECLINE" ? "Mbaj orarin e mëparshëm" : "Tërhiq propozimin"}
                  confirmation={action === "ACCEPT" && quote.scheduledAt ? `Ndryshoni rezervimin në ${dateTime(quote.scheduledAt)}? Çmimi mbetet ${money(quote.amount)}.` : undefined} />
              ))}
            </div>
          )}
          <time className="mt-2 block text-xs text-muted">{dateTime(quote.createdAt)}</time>
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
          <p className="text-xs font-semibold text-gold-dark">Përshkrimi i punës</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.detail}</p>
          {request.timing !== DEFAULT_CHAT_TIMING && <p className="mt-2 text-xs text-muted">Koha e kërkuar: {request.timing}</p>}
          {recurrence && <p className="mt-2 text-xs">
            Vizitë e përsëritur: {recurrenceLabels[recurrence.cadence]} · {dateTime(new Date(recurrence.scheduledAt))} (ora e Kosovës).
            Çdo vizitë kërkon ofertë dhe pranim të veçantë. Nuk ka tarifim automatik të kartës.
          </p>}
          {request.address && <p className="mt-2 text-xs">Adresa: {request.address}</p>}
          <time className="mt-1 block text-xs text-muted">{dateTime(request.createdAt)}</time>
        </div>
      ),
    },
    // A Book now job shows its booking card instead of a quote card.
    ...(request.booking
      ? bookingEvents(request.booking, { pro, requestId: id, active: ["BOOKED", "IN_PROGRESS"].includes(request.state) })
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
                `Vendimi i administratës: ${outcomeLabels[request.payment.dispute.outcome as DisputeOutcome] ?? request.payment.dispute.outcome}`,
                request.payment.dispute.refundCents > 0 ? `rimbursim ${money(request.payment.dispute.refundCents)}` : "",
                request.payment.dispute.customerCreditCents > 0 ? `kredi ${money(request.payment.dispute.customerCreditCents)}` : "",
                request.payment.dispute.finalPriceCents ? `çmimi përfundimtar ${money(request.payment.dispute.finalPriceCents)}` : "",
                dateTime(request.payment.dispute.resolvedAt),
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
      title={`Biseda me ${counterpart}`}
      subtitle={`${category} · ${request.city} · ${request.title}`}
    >
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Statusi i punës</h2>
          <ol aria-label="Statusi i punës" className="flex flex-wrap gap-2">
            {status.cancelled ? (
              <li className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800" aria-current="step">Anuluar</li>
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
                  {stage.label}
                </li>
              ))
            )}
          </ol>
        </div>
        {status.reached < 0 && !status.cancelled && (
          <p className="mt-3 text-sm text-muted">
            {pro
              ? "Bisedoni me klientin dhe dërgoni një ofertë me çmim kur të jeni gati. Klienti ju punëson me butonin “Puneso”."
              : "Bisedoni me profesionistin. Kur ai dërgon ofertën në bisedë, shtypni “Puneso” për ta punësuar."}
          </p>
        )}
        {status.disputed && <p className="mt-3 text-sm">Puna është në shqyrtim nga administrata e Zgjoi.</p>}
        {request.state === "BOOKED" && request.acceptedQuote?.scheduledAt && (
          <p className="mt-3 rounded-xl bg-cream p-3 text-sm">
            Orari i konfirmuar: {dateTime(request.acceptedQuote.scheduledAt)} (ora e Kosovës).
            {latest && " Ky orar mbetet i rezervuar derisa klienti të pranojë propozimin e ri."}
          </p>
        )}
        {request.booking && (
          <div className="mt-4">
            <BookingPanel b={request.booking} pro={pro} requestId={id} requestState={request.state} version={request.version}
              paidCents={request.payment?.state === "HELD" ? request.booking.dueCents : 0} whatsapp={whatsapp} />
          </div>
        )}
        {request.conversation && (
          <div className="mt-4">
            <Thread
              key={request.conversation.id}
              id={request.conversation.id}
              closed={closed}
              events={events}
              placeholder={pro ? "Shkruani klientit…" : `Shkruani ${counterpart}…`}
            />
          </div>
        )}
        {commissionError && <p className="mt-4 rounded-xl bg-cream p-3" role="alert">{commissionError}</p>}
        {pro && commission && ["OPEN", "QUOTED"].includes(request.state) && (
          <details className="mt-4 rounded-2xl border border-gold bg-white p-4" open={!request.quotes.length}>
            <summary className="cursor-pointer font-semibold">
              {request.quotes.length ? "Dërgo një ofertë të re" : "Dërgo ofertën me çmim"}
            </summary>
            <p className="my-3 text-sm text-muted">
              Oferta shfaqet në bisedë si kartë me butonin “Puneso”. Një ofertë e re zëvendëson të mëparshmen.
              Komisioni aktual i platformës është {commission.bps / 100}% e çmimit total dhe fiksohet kur klienti ju punëson.
              Pagesat janë ende në provë.
            </p>
            <ApiForm
              key={request.version}
              endpoint="/api/offers"
              idempotent
              values={{ requestId: id, expectedVersion: request.version }}
              label="Dërgo ofertën në bisedë"
              fields={[
                { name: "amount", label: "Çmimi total në euro", type: "number", min: 0.01, max: 100000, step: "0.01", required: true },
                { name: "description", label: "Shënim (opsional)", type: "textarea", maxLength: 4000, hint: "P.sh. çfarë përfshihet në çmim. Pa numra telefoni, email ose lidhje." },
                { name: "scheduledAt", label: "Data dhe ora e fillimit (opsionale, ora e Kosovës)", type: "datetime-local", kosovoTime: true, hint: "Nëse e caktoni, orari rezervohet kur klienti ju punëson. Ndryshe data caktohet në bisedë." },
                { name: "duration", label: "Kohëzgjatja në minuta (nëse caktoni datën)", type: "number", min: 1, max: 43200, step: "1", hint: "P.sh. 120 për dy orë." },
                { name: "expiresInHours", label: "Oferta vlen", type: "select", as: "number", required: true, value: "72",
                  options: [{ value: "24", label: "24 orë" }, { value: "72", label: "3 ditë" }, { value: "168", label: "7 ditë" }] },
              ]}
            />
          </details>
        )}
        {pro && request.state === "BOOKED" && request.unpaidEditable && request.acceptedQuote?.scheduledAt && (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">Propozo orar tjetër</summary>
            <p className="my-3 text-sm text-muted">Klienti duhet ta pranojë ndryshimin. Orari i mëparshëm mbetet i rezervuar; çmimi dhe përshkrimi i punës nuk ndryshojnë. Orari i ri kontrollohet përsëri kur pranohet.</p>
            <ApiForm key={`reschedule-${request.version}`} endpoint={`/api/requests/${id}/reschedule`} idempotent
              values={{ action: "PROPOSE", expectedVersion: request.version }} label="Dërgo propozimin e orarit"
              fields={[
                { name: "timing", label: "Përshkrimi i orarit të ri", required: true, minLength: 3, maxLength: 120 },
                { name: "expiresAt", label: "Propozimi skadon (ora e Kosovës)", type: "datetime-local", kosovoTime: true, required: true, hint: "Brenda 30 ditëve dhe para orarit të ri." },
                { name: "scheduledAt", label: "Fillimi i ri (ora e Kosovës)", type: "datetime-local", kosovoTime: true, required: true },
              ]} />
          </details>
        )}
        {funded && active && !request.payment?.dispute && (
          <div className="mt-4 rounded-2xl bg-cream p-4">
            <h3 className="mb-3 font-bold">Ecuria e punës</h3>
            {pro ? (
              <div className="flex flex-wrap gap-3">
                {request.state === "BOOKED" && jobAction("START", "Fillo punën")}
                {!request.completionRequestedAt &&
                  jobAction("REQUEST_COMPLETION", "Kërko konfirmimin e klientit", "Puna ka përfunduar dhe është gati për konfirmim?")}
                {request.completionRequestedAt && <p>Klientit i është kërkuar të konfirmojë përfundimin.</p>}
              </div>
            ) : (
              <>
                {request.completionRequestedAt && <p className="mb-3">Profesionisti e ka shënuar punën gati për konfirmim.</p>}
                {jobAction(
                  "CONFIRM_COMPLETION",
                  "Konfirmo përfundimin",
                  "Konfirmoni se puna ka përfunduar sipas marrëveshjes? Ky veprim lejon transferimin e pagesës te profesionisti.",
                )}
              </>
            )}
          </div>
        )}
      </Panel>
      {request.payment && (
        <Panel>
          <h2 className="text-lg font-bold">
            Pagesa · {stateLabel(request.payment.state)}
          </h2>
          <p className="mt-2">Totali: {money(request.payment.amount)}</p>
          {request.payment.estimateCreditCents > 0 && (
            <p className="mt-1 text-sm">
              Kredi nga vlerësimi i paguar: −{money(Math.min(request.payment.estimateCreditCents, request.payment.amount))} · Për t’u paguar:{" "}
              {money(Math.max(0, request.payment.amount - request.payment.estimateCreditCents))}
            </p>
          )}
          {pro && (
            <p className="mt-1 text-sm">
              Komisioni ({request.payment.commissionBps / 100}%): {money(request.payment.commissionAmount)} · Për ju:{" "}
              {money(request.payment.proAmount)}
            </p>
          )}
          {request.payment.state === "PENDING" && request.state === "BOOKED" && (
            <div className="mt-4">
              {latest ? (
                <p>{pro ? "Në pritje të vendimit të klientit për orarin e ri." : "Pranoni ose refuzoni propozimin e orarit para pagesës."}</p>
              ) : pro ? (
                <p>
                  Prisni konfirmimin e pagesës para se të filloni punën.
                  {!paymentsReady() && " Gjatë beta-s, pagesën e konfirmon administrata e Zgjoi dhe ju njoftojmë menjëherë."}
                </p>
              ) : paymentsReady() ? (
                <>
                  <p className="mb-3 text-sm">
                    Mjedis prove: përdorni vetëm kartë prove. Konfirmimi shfaqet
                    pas përpunimit.
                  </p>
                  <ApiForm
                    endpoint="/api/payments/checkout"
                    values={{ requestId: id }}
                    label="Vazhdo te pagesa e provës"
                  />
                </>
              ) : (
                <p role="status">
                  Pagesat online nuk janë ende të disponueshme. Oferta është
                  ruajtur dhe asnjë pagesë nuk është kryer në platformë. Gjatë
                  beta-s, pagesa rregullohet me ekipin e Zgjoi; pasi ta
                  konfirmojmë, profesionisti mund të fillojë punën.
                </p>
              )}
            </div>
          )}
          {request.state === "CANCELLED" && request.payment.state === "EXPIRED" && (
            <p className="mt-3 text-sm">Rezervimi u anulua para fillimit të pagesës. Asnjë shumë nuk u tarifua.</p>
          )}
          {funded && (
            <p className="mt-3 text-sm">
              {request.payment.provider === "offline"
                ? "Pagesa u konfirmua nga administrata e Zgjoi (beta, pagesë jashtë platformës). Pjesa e profesionistit transferohet pas konfirmimit të përfundimit nga klienti."
                : "Pagesa është konfirmuar. Fondet mund t’i transferohen profesionistit pas konfirmimit të përfundimit nga klienti."}
            </p>
          )}
          {request.payment.dispute && (() => {
            const d = request.payment.dispute;
            const mineOpened = d.openedByRole ? (d.openedByRole === "PRO") === pro : !pro;
            const canRespond = !d.resolvedAt && !mineOpened && !d.response && (!d.respondBy || d.respondBy > new Date());
            return (
              <div className="mt-3 space-y-3 rounded-xl bg-cream p-3">
                <h3 className="font-bold">Kontesti</h3>
                <div>
                  <p className="text-xs font-semibold text-gold-dark">Deklarata e {d.openedByRole === "PRO" ? "profesionistit" : "klientit"}{mineOpened ? " (ju)" : ""}</p>
                  <p className="whitespace-pre-wrap text-sm">{d.reason}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gold-dark">Deklarata e {d.openedByRole === "PRO" ? "klientit" : "profesionistit"}{!mineOpened ? " (ju)" : ""}</p>
                  <p className="whitespace-pre-wrap text-sm">
                    {d.response ?? (d.respondBy && d.respondBy > new Date() ? `Në pritje deri më ${dateTime(d.respondBy)}.` : "Nuk u shtua brenda afatit.")}
                  </p>
                </div>
                {canRespond && (
                  <ApiForm endpoint="/api/disputes" values={{ action: "RESPOND", requestId: id }} label="Shto deklaratën tuaj"
                    fields={[{ name: "statement", label: `Përgjigjuni brenda ${DISPUTE_RESPONSE_HOURS} orëve`, type: "textarea", minLength: 20, maxLength: 4000, required: true }]} />
                )}
                <p className="text-sm">
                  {d.resolvedAt
                    ? `${outcomeLabels[d.outcome as DisputeOutcome] ?? d.outcome}${d.resolution ? ` — ${d.resolution}` : ""}`
                    : "Në shqyrtim nga administrata."}
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
              Raporto një problem me punën
            </summary>
            <p className="mt-2 text-sm text-muted">
              Pala tjetër ka {DISPUTE_RESPONSE_HOURS} orë të shtojë deklaratën e saj; pastaj vendos administrata e Zgjoi
              (rimbursim, kredi ose pa veprim). Një problem raportohet deri në {DISPUTE_OPEN_DAYS} ditë pas punës.
            </p>
            <div className="mt-4">
              <ApiForm
                endpoint="/api/disputes"
                values={{ requestId: id }}
                label="Hap kontestin"
                fields={[
                  {
                    name: "reason",
                    label: "Përshkruani problemin",
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
          <h2 className="mb-3 text-lg font-bold">Përsërit shërbimin</h2>
          <p className="mb-4 text-sm text-muted">Kërkoni vizitën pasuese me të njëjtin profesionist. Komisioni për profesionistin është 5% për vizitën e përsëritur që plotëson kushtet. Profesionisti dërgon ofertën dhe ju e pranoni para pagesës. Asnjë tarifim automatik.</p>
          <ApiForm endpoint={`/api/requests/${id}/recurrence`} label="Kërko vizitën pasuese"
            fields={[{ name: "cadence", label: "Shpeshtësia", type: "select", required: true,
              options: Object.entries(recurrenceLabels).map(([value, label]) => ({ value, label })) }]} />
        </Panel>
      )}
      {!pro && request.state === "COMPLETED" && (
        <Panel>
          <h2 className="mb-4 text-lg font-bold">Vlerësimi juaj</h2>
          {request.review ? (
            <>
              <p>{request.review.rating}/5</p>
              <p>{request.review.text}</p>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                Vlerësimi është opsional. Përfundimi i punës është konfirmuar
                tashmë.
              </p>
              <ApiForm
                endpoint="/api/reviews"
                values={{ requestId: id }}
                label="Publiko vlerësimin"
                fields={[
                  {
                    name: "rating",
                    label: "Vlerësimi",
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
                    label: "Përvoja juaj",
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
            request.state === "BOOKED" ? "Anulo rezervimin pa pagesë" : "Mbyll bisedën",
            request.state === "BOOKED"
              ? "Anuloni këtë rezervim pa pagesë? Orari lirohet dhe pala tjetër njoftohet."
              : "Mbyllni këtë bisedë? Ofertat e hapura tërhiqen dhe pala tjetër njoftohet.",
          )}
        </Panel>
      )}
    </Frame>
  );
}
