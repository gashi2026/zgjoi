import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { getRequest } from "@/lib/server/marketplace";
import { AppError } from "@/lib/server/errors";
import { paymentsReady } from "@/lib/server/payments";
import { money, stateLabel, dateTime } from "@/lib/format";
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
  const funded = request.payment?.state === "HELD";
  const active = ["BOOKED", "IN_PROGRESS"].includes(request.state);
  const jobAction = (
    action: string,
    label: string,
    confirmation?: string,
    quoteId?: string,
  ) => (
    <ApiForm
      endpoint={`/api/requests/${id}`}
      values={{ action, quoteId }}
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
        {request.address && <p className="mt-2">Adresa: {request.address}</p>}
        <p className="mt-2 text-xs text-muted">
          Krijuar: {dateTime(request.createdAt)}
        </p>
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-bold">Oferta zyrtare</h2>
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
            <p className="mt-2 text-sm">
              {quote.availableAt} · Kohëzgjatja: {quote.duration}
            </p>
            {quote.scheduledAt && (
              <p className="text-sm">
                Fillimi: {dateTime(quote.scheduledAt)} (ora e Kosovës)
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
          </article>
        ))}
        {pro && ["OPEN", "QUOTED"].includes(request.state) && (
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
                label: "Kohëzgjatja e parashikuar",
                required: true,
                maxLength: 60,
              },
              {
                name: "expiresAt",
                label: "Oferta skadon",
                type: "datetime-local",
                required: true,
                hint: "Brenda 30 ditësh dhe para fillimit të punës. Përdoret zona kohore e pajisjes suaj.",
              },
              {
                name: "scheduledAt",
                label: "Fillimi i punës",
                type: "datetime-local",
                required: true,
                hint: "Pas skadimit të ofertës. Përdoret zona kohore e pajisjes suaj.",
              },
            ]}
          />
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
              Komisioni: {money(request.payment.commissionAmount)} · Për ju:{" "}
              {money(request.payment.proAmount)}
            </p>
          )}
          {request.payment.state === "PENDING" && (
            <div className="mt-4">
              {pro ? (
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
            id={request.conversation.id}
            closed={["CANCELLED", "COMPLETED"].includes(request.state)}
          />
        </Panel>
      )}
      {["OPEN", "QUOTED"].includes(request.state) && (
        <Panel>
          {jobAction(
            "CANCEL",
            "Anulo kërkesën",
            "Anuloni këtë kërkesë dhe ofertat e saj?",
          )}
        </Panel>
      )}
    </Frame>
  );
}
