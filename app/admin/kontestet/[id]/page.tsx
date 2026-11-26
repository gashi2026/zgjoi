import Link from "next/link";
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
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
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
  const opener = d.openedByRole === "PRO" ? "Profesionisti" : "Klienti", other = d.openedByRole === "PRO" ? "Klienti" : "Profesionisti";
  const ready = readyForDecision(d, new Date());
  return (
    <Frame actor={actor} title={`Kontesti · ${r.title}`} subtitle={`${r.client.name} ↔ ${r.acceptedPro?.user.name ?? "—"} · hapur ${dateTime(d.createdAt)}`}>
      <Panel>
        <h2 className="text-lg font-bold">Detajet e punës</h2>
        <p className="mt-2 text-sm">Statusi para kontestit: {stateLabel(d.priorState ?? "")} · {r.city}</p>
        <p className="text-sm">Totali: {money(d.payment.amount)} · Komisioni {d.payment.commissionBps / 100}%: {money(d.payment.commissionAmount)} · Profesionisti: {money(d.payment.proAmount)}</p>
        {d.payment.estimateCreditCents > 0 && <p className="text-sm">Kredi nga vlerësimi: {money(d.payment.estimateCreditCents)}</p>}
        <p className="text-sm">Pagesa: {stateLabel(d.payment.state)}{d.payment.heldAt ? ` · konfirmuar ${dateTime(d.payment.heldAt)}` : ""}</p>
        {r.booking && <p className="text-sm">Rezervo tani · {hoursLabel(r.booking.minutes)} × {money(r.booking.hourlyRateCents)}/orë · fillimi {dateTime(r.booking.startsAt)}</p>}
        {r.acceptedQuote?.scheduledAt && <p className="text-sm">Orari: {dateTime(r.acceptedQuote.scheduledAt)}{r.startedAt ? ` · filloi ${dateTime(r.startedAt)}` : ""}{r.completedAt ? ` · përfundoi ${dateTime(r.completedAt)}` : ""}</p>}
        {r.detail && <p className="mt-2 whitespace-pre-wrap text-sm">{r.detail}</p>}
        {trust && <p className="mt-2 text-sm text-muted">Historiku i profesionistit: {trust.booked} punë · {trust.onTime} në kohë · {trust.late} me vonesë · {trust.notFinished} pa përfunduar · {trust.disputes} konteste · {trust.cancellations} anulime (90 ditë)</p>}
        <Link className="mt-2 inline-block text-sm text-gold-dark" href="/admin/pagesat">Pagesat dhe detyrat →</Link>
      </Panel>
      {r.booking && <ArrivalAdminPanel requestId={r.id} startsAt={r.booking.startsAt} siteGeocode={r.booking.siteGeocode} arrival={r.booking.arrival} active={false} />}
      <Panel>
        <h2 className="text-lg font-bold">Deklaratat</h2>
        <div className="mt-3 rounded-xl bg-cream p-3">
          <p className="text-xs font-semibold text-gold-dark">{opener} · {dateTime(d.createdAt)}</p>
          <p className="whitespace-pre-wrap text-sm">{d.reason}</p>
        </div>
        <div className="mt-3 rounded-xl bg-cream p-3">
          <p className="text-xs font-semibold text-gold-dark">{other}{d.respondedAt ? ` · ${dateTime(d.respondedAt)}` : ""}</p>
          <p className="whitespace-pre-wrap text-sm">{d.response ?? (d.respondBy && d.respondBy > new Date() ? `Në pritje deri më ${dateTime(d.respondBy)}.` : "Nuk u përgjigj brenda 48 orëve.")}</p>
        </div>
      </Panel>
      <Panel>
        <h2 className="text-lg font-bold">Vendimi</h2>
        {d.resolvedAt ? (
          <p className="mt-2 text-sm">
            {outcomeLabels[d.outcome as DisputeOutcome] ?? d.outcome} · {dateTime(d.resolvedAt)}
            {d.finalPriceCents ? ` · çmimi përfundimtar ${money(d.finalPriceCents)}` : ""}
            {d.refundCents ? ` · rimbursim ${money(d.refundCents)}` : ""}{d.customerCreditCents ? ` · kredi ${money(d.customerCreditCents)}` : ""}
            {d.resolution ? ` — ${d.resolution}` : ""}
          </p>
        ) : !ready ? (
          <p className="mt-2 text-sm">Pala tjetër ka kohë deri më {d.respondBy ? dateTime(d.respondBy) : "—"} të shtojë deklaratën. Vendimi hapet pas saj ose pas afatit.</p>
        ) : (
          <ApiForm endpoint="/api/admin/disputes" values={{ action: "DECIDE", id: d.id }} label="Ruaj vendimin"
            confirmation="Ruani vendimin? Të dyja palët njoftohen në bisedë dhe rimbursimi/kredia shfaqet si detyrë te Pagesat."
            fields={[
              { name: "outcome", label: "Vendimi", type: "select", required: true, value: "NO_ACTION",
                options: Object.entries(outcomeLabels).map(([value, label]) => ({ value, label })) },
              { name: "finalPrice", label: "Çmimi përfundimtar në euro (opsional)", type: "number", step: "0.01", min: 0.01, max: 100000,
                hint: `Totali aktual ${money(d.payment.amount)}. Komisioni dhe pjesa e profesionistit rillogariten. I detyrueshëm për rimbursim të pjesshëm.` },
              { name: "customerCredit", label: "Kredi për klientin në euro (vetëm për “Kredi”)", type: "number", step: "0.01", min: 0.01, max: 100000 },
              { name: "resolution", label: "Arsyetimi (u shfaqet palëve)", type: "textarea", required: true, minLength: 10, maxLength: 2000 },
            ]} />
        )}
      </Panel>
    </Frame>
  );
}
