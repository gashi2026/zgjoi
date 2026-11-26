import Link from "next/link";
import { db } from "@/lib/server/db";
import { pageGuard } from "@/lib/server/guard";
import { money, dateTime, stateLabel } from "@/lib/format";
import { paymentsReady } from "@/lib/server/payments";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await pageGuard("ADMIN");
  const page = Math.min(
    1000,
    Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1),
  );
  const payments = await db.payment.findMany({
    include: {
      request: {
        select: {
          title: true,
          state: true,
          completedAt: true,
          client: { select: { name: true } },
          acceptedPro: { select: { user: { select: { name: true } } } },
        },
      },
      dispute: true,
      payouts: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    skip: (page - 1) * 50,
  });
  return (
    <Frame
      actor={actor}
      title="Pagesat dhe kontestet"
      subtitle="Gjendja e pagesave ndryshon vetëm nga ngjarje të verifikuara te ofruesi ose nga një konfirmim i regjistruar i administratës gjatë beta-s."
    >
      <Panel>
        <p>
          {paymentsReady()
            ? "Mjedis prove Stripe. Asnjë pagesë reale nuk mund të përpunohet nga ky version."
            : "Pagesat online janë të çaktivizuara. Gjatë beta-s, pasi të konfirmoni pagesën e klientit jashtë platformës, përdorni “Shëno si të paguar” te rezervimi përkatës."}
        </p>
      </Panel>
      {!payments.length && <Panel>Nuk ka pagesa të regjistruara.</Panel>}
      {payments.map((p) => (
        <Panel key={p.id}>
          <h2 className="text-lg font-bold">{p.request.title}</h2>
          <p className="mt-2">
            {p.request.client.name} → {p.request.acceptedPro?.user.name ?? "—"}
          </p>
          <p className="mt-2">
            {money(p.amount)} · {stateLabel(p.state)} · {dateTime(p.createdAt)}
          </p>
          <p className="text-sm text-muted">
            Komisioni: {money(p.commissionAmount)} · Profesionisti:{" "}
            {money(p.proAmount)} · {stateLabel(p.request.state)}
          </p>
          {p.operation && (
            <p className="mt-2 font-semibold">
              Veprim në pritje të konfirmimit: {p.operation}. Kontrolloni
              ofruesin para çdo ndërhyrjeje.
            </p>
          )}
          {p.dispute && (
            <div className="mt-3 rounded-xl bg-cream p-3">
              <h3 className="font-bold">Kontesti</h3>
              <p className="whitespace-pre-wrap">{p.dispute.reason}</p>
              <p>{p.dispute.resolution || "Pa zgjidhje ende"}</p>
            </div>
          )}
          {p.payouts.map((out) => (
            <p key={out.id} className="mt-2 text-sm">
              {stateLabel(out.state)}: {money(out.amount)}
            </p>
          ))}
          {p.provider === "offline" && (
            <p className="mt-2 text-sm font-semibold">
              Shënuar si e paguar jashtë platformës (beta) më{" "}
              {p.heldAt ? dateTime(p.heldAt) : "—"}. Transferimi te
              profesionisti bëhet manualisht.
            </p>
          )}
          {p.state === "PENDING" &&
            p.provider === "disabled" &&
            !p.providerCheckoutId &&
            !p.operation &&
            !p.dispute &&
            p.request.state === "BOOKED" && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">
                  Shëno si të paguar (beta, pa pagesë online)
                </summary>
                <ApiForm
                  endpoint="/api/admin/payments"
                  values={{ id: p.id, action: "MARK_PAID_OFFLINE" }}
                  label="Shëno si të paguar"
                  confirmation={`Konfirmoni që klienti ka paguar ${money(p.amount)} jashtë platformës? Profesionisti do të njoftohet se mund të fillojë punën. Ky veprim regjistrohet në auditim.`}
                  fields={[
                    {
                      name: "reason",
                      label: "Si u pagua? (p.sh. para në dorë, transfer bankar, referenca)",
                      type: "textarea",
                      minLength: 10,
                      maxLength: 500,
                      required: true,
                    },
                  ]}
                />
              </details>
            )}
          {paymentsReady() &&
            p.provider === "stripe_test" &&
            p.state === "HELD" &&
            p.request.state === "COMPLETED" &&
            p.request.completedAt &&
            !p.dispute && (
              <div className="mt-4">
                <ApiForm
                  endpoint="/api/admin/payments"
                  values={{ id: p.id, action: "RELEASE" }}
                  label="Transfero pjesën e profesionistit (provë)"
                  confirmation="Klienti ka konfirmuar përfundimin. Kryeni transferimin te llogaria e profesionistit?"
                />
              </div>
            )}
          {paymentsReady() &&
            p.provider === "stripe_test" &&
            ["HELD", "DISPUTED", "REFUND_PENDING"].includes(p.state) &&
            !p.stripeTransferId && (
              <details className="mt-4">
                <summary>Rimbursim i plotë (provë)</summary>
                <ApiForm
                  endpoint="/api/admin/payments"
                  values={{ id: p.id, action: "REFUND" }}
                  label="Kryej rimbursimin"
                  confirmation="Kryeni rimbursimin e plotë për klientin?"
                  fields={[
                    {
                      name: "reason",
                      label: "Arsyeja dhe rezultati i shqyrtimit",
                      type: "textarea",
                      minLength: 20,
                      maxLength: 1000,
                      required: true,
                    },
                  ]}
                />
              </details>
            )}
        </Panel>
      ))}
      <nav className="flex gap-4">
        {page > 1 && <Link href={`?page=${page - 1}`}>← Më parë</Link>}
        {payments.length === 50 && (
          <Link href={`?page=${page + 1}`}>Tjetër →</Link>
        )}
      </nav>
    </Frame>
  );
}
