import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { getRequest } from "@/lib/server/marketplace";
import { AppError } from "@/lib/server/errors";
import { paymentsReady } from "@/lib/server/payments";
import { bookingCommission } from "@/lib/server/commissions";
import { db } from "@/lib/server/db";
import { readRecurrence, recurrenceLabels } from "@/lib/recurring-bookings";
import { money, stateLabel, dateTime } from "@/lib/format";
import { appointmentEnd } from "@/lib/appointments";
import Frame, { Panel } from "./Frame";
import ApiForm from "./ApiForm";
import Thread from "./Thread";
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
  return (
    <Frame
      actor={actor}
      title={request.title}
      subtitle={`${stateLabel(request.state)} · ${pro ? request.client.name : (request.selectedPro?.user.name ?? "Profesionisti")} · ${request.city}`}
    >
      <Panel>
        <h2 className="text-lg font-bold">Detajet e kërkesës</h2>
        <p className="mt-3 whitespace-pre-wrap">{request.detail}</p>
        <p className="mt-3 text-sm text-muted">
          Koha e kërkuar: {request.timing}
        </p>
        {recurrence && <p className="mt-3 rounded-xl bg-cream p-3">
          Vizitë e përsëritur: {recurrenceLabels[recurrence.cadence]} · {dateTime(new Date(recurrence.scheduledAt))} (ora e Kosovës).
          Çdo vizitë kërkon ofertë dhe pranim të veçantë. Nuk ka tarifim automatik të kartës.
        </p>}
        {request.address && <p className="mt-2">Adresa: {request.address}</p>}
        <p className="mt-2 text-xs text-muted">
          Krijuar: {dateTime(request.createdAt)}
        </p>
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-bold">Oferta zyrtare</h2>
        {request.state === "BOOKED" && request.acceptedQuote?.scheduledAt && (
          <p className="mb-4 rounded-xl bg-cream p-3">
            Orari i konfirmuar: {dateTime(request.acceptedQuote.scheduledAt)} (ora e Kosovës).
            {latest && " Ky orar mbetet i rezervuar derisa klienti të pranojë propozimin e ri."}
          </p>
        )}
        {!request.quotes.length && (
          <p className="text-muted">
            {pro
              ? "Dërgoni çmimin, përshkrimin dhe orarin tuaj më poshtë."
              : "Në pritje të ofertës nga profesionisti."}
          </p>
        )}
        {request.quotes.map((quote) => (
          <article
            key={quote.id}
            className="mb-4 rounded-xl border border-line p-4"
          >
            <p className="font-bold">
              {money(quote.amount)} ·{" "}
              {quote.expiresAt &&
              quote.state === "SENT" &&
              quote.expiresAt <= new Date()
                ? "Skaduar"
                : stateLabel(quote.state)}{" "}
              · Versioni {quote.revision}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{quote.message}</p>
            {request.state === "BOOKED" && quote.state === "SENT" && (
              <p className="mt-2 font-semibold">Propozim për ndryshimin e orarit · Çmimi dhe puna mbeten të njëjta.</p>
            )}
            <p className="mt-2 text-sm">
              {quote.availableAt} · Kohëzgjatja: {quote.duration}
            </p>
            {quote.scheduledAt && (
              <p className="text-sm">
                Fillimi: {dateTime(quote.scheduledAt)} (ora e Kosovës)
                {appointmentEnd(quote.scheduledAt, quote.duration) && <> · Përfundimi i parashikuar: {dateTime(appointmentEnd(quote.scheduledAt, quote.duration)!)}</>}
              </p>
            )}
            {quote.expiresAt && (
              <p className="text-sm text-muted">
                Pranohet deri: {dateTime(quote.expiresAt)}
              </p>
            )}
            {!pro && latest?.id === quote.id && request.state === "QUOTED" && (
              <div className="mt-4 flex flex-wrap gap-3">
                <ApiForm
                  endpoint="/api/offers/accept"
                  values={{
                    quoteId: quote.id,
                    expectedVersion: request.version,
                  }}
                  label="Prano ofertën"
                  confirmation={`Pranoni ofertën prej ${money(quote.amount)}? Pagesa kryhet në hapin tjetër.`}
                />
                {jobAction("DECLINE", "Refuzo ofertën", undefined, quote.id)}
              </div>
            )}
            {pro && latest?.id === quote.id && request.state === "QUOTED" && (
              <div className="mt-4">
                {jobAction(
                  "WITHDRAW",
                  "Tërhiq ofertën",
                  "Tërhiqni këtë ofertë?",
                  quote.id,
                )}
              </div>
            )}
            {request.state === "BOOKED" && request.unpaidEditable && latest?.id === quote.id && (
              <div className="mt-4 flex flex-wrap gap-3">
                {(pro ? ["WITHDRAW"] : ["ACCEPT", "DECLINE"]).map(action => (
                  <ApiForm key={action} endpoint={`/api/requests/${id}/reschedule`}
                    values={{ action, quoteId: quote.id, expectedVersion: request.version }}
                    label={action === "ACCEPT" ? "Prano orarin e ri" : action === "DECLINE" ? "Mbaj orarin e mëparshëm" : "Tërhiq propozimin"}
                    confirmation={action === "ACCEPT" ? `Ndryshoni rezervimin në ${dateTime(quote.scheduledAt!)}? Çmimi mbetet ${money(quote.amount)}.` : undefined} />
                ))}
              </div>
            )}
          </article>
        ))}
        {commissionError && <p className="rounded-xl bg-cream p-3" role="alert">{commissionError}</p>}
        {pro && commission && ["OPEN", "QUOTED"].includes(request.state) && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Komisioni aktual i platformës është {commission.bps / 100}% e
              çmimit total. Shumat e rezervimit shfaqen pas pranimit. Pagesat
              janë ende në provë. Norma fiksohet në pranimin e ofertës dhe nuk ndryshon për pagesat ekzistuese.
            </p>
            <ApiForm
              key={request.version}
              endpoint="/api/offers"
              idempotent
              values={{ requestId: id, expectedVersion: request.version }}
              label={
                request.quotes.length ? "Dërgo ofertën e re" : "Dërgo ofertën"
              }
              fields={[
                {
                  name: "amount",
                  label: "Çmimi total në euro",
                  type: "number",
                  min: 0.01,
                  max: 100000,
                  step: "0.01",
                  required: true,
                },
                {
                  name: "description",
                  label: "Çfarë përfshihet në çmim?",
                  type: "textarea",
                  minLength: 20,
                  maxLength: 4000,
                  required: true,
                },
                {
                  name: "timing",
                  label: "Përshkrimi i orarit",
                  required: true,
                  minLength: 3,
                  maxLength: 120,
                },
                {
                  name: "duration",
                  label: "Kohëzgjatja në minuta",
                  type: "number",
                  min: 1,
                  max: 43200,
                  step: "1",
                  required: true,
                  hint: "P.sh. 120 për dy orë. Ky interval rezervohet kur klienti pranon ofertën.",
                },
                {
                  name: "expiresAt",
                  label: "Oferta skadon (ora e Kosovës)",
                  kosovoTime: true,
                  type: "datetime-local",
                  required: true,
                  hint: "Brenda 30 ditësh dhe para fillimit të punës. Shkruani orën lokale të Kosovës.",
                },
                {
                  name: "scheduledAt",
                  label: "Fillimi i punës (ora e Kosovës)",
                  kosovoTime: true,
                  type: "datetime-local",
                  required: true,
                  hint: "Pas skadimit të ofertës. Shkruani orën lokale të Kosovës.",
                },
              ]}
            />
          </div>
        )}
        {pro && request.state === "BOOKED" && request.unpaidEditable && (
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
      </Panel>
      {request.payment && (
        <Panel>
          <h2 className="text-lg font-bold">
            Pagesa · {stateLabel(request.payment.state)}
          </h2>
          <p className="mt-2">Totali: {money(request.payment.amount)}</p>
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
                <p>Prisni konfirmimin e pagesës para se të filloni punën.</p>
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
                  ruajtur; asnjë pagesë nuk është kryer. Do të njoftoheni kur
                  pagesat të jenë gati.
                </p>
              )}
            </div>
          )}
          {request.state === "CANCELLED" && request.payment.state === "EXPIRED" && (
            <p className="mt-3 text-sm">Rezervimi u anulua para fillimit të pagesës. Asnjë shumë nuk u tarifua.</p>
          )}
          {funded && (
            <p className="mt-3 text-sm">
              Pagesa është konfirmuar. Fondet mund t’i transferohen
              profesionistit pas konfirmimit të përfundimit nga klienti.
            </p>
          )}
          {request.payment.dispute && (
            <div className="mt-3 rounded-xl bg-cream p-3">
              <h3 className="font-bold">Kontesti</h3>
              <p className="whitespace-pre-wrap">
                {request.payment.dispute.reason}
              </p>
              <p>
                {request.payment.dispute.resolution ||
                  "Në shqyrtim nga administrata."}
              </p>
            </div>
          )}
        </Panel>
      )}
      {funded && active && !request.payment?.dispute && (
        <Panel>
          <h2 className="mb-4 text-lg font-bold">Ecuria e punës</h2>
          {pro ? (
            <div className="flex flex-wrap gap-3">
              {request.state === "BOOKED" && jobAction("START", "Fillo punën")}
              {!request.completionRequestedAt &&
                jobAction(
                  "REQUEST_COMPLETION",
                  "Kërko konfirmimin e klientit",
                  "Puna ka përfunduar dhe është gati për konfirmim?",
                )}
              {request.completionRequestedAt && (
                <p>Klientit i është kërkuar të konfirmojë përfundimin.</p>
              )}
            </div>
          ) : (
            <>
              {request.completionRequestedAt && (
                <p className="mb-3">
                  Profesionisti e ka shënuar punën gati për konfirmim.
                </p>
              )}
              {jobAction(
                "CONFIRM_COMPLETION",
                "Konfirmo përfundimin",
                "Konfirmoni se puna ka përfunduar sipas marrëveshjes? Ky veprim lejon transferimin e pagesës te profesionisti.",
              )}
            </>
          )}
        </Panel>
      )}
      {funded && !request.payment?.dispute && (
        <Panel>
          <details>
            <summary className="cursor-pointer font-semibold">
              Raporto një problem me punën
            </summary>
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
      {request.conversation && (
        <Panel>
          <h2 className="mb-4 text-lg font-bold">Biseda private</h2>
          <Thread
            key={request.conversation.id}
            id={request.conversation.id}
            closed={["CANCELLED", "COMPLETED"].includes(request.state)}
          />
        </Panel>
      )}
      {request.unpaidEditable && (
        <Panel>
          {jobAction(
            "CANCEL",
            request.state === "BOOKED" ? "Anulo rezervimin pa pagesë" : "Anulo kërkesën",
            "Anuloni këtë kërkesë dhe ofertat e saj pa pagesë? Orari lirohet dhe pala tjetër njoftohet.",
          )}
        </Panel>
      )}
    </Frame>
  );
}
