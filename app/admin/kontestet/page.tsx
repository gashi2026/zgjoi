import Link from "next/link";
import { db } from "@/lib/server/db";
import { pageGuard } from "@/lib/server/guard";
import { money, dateTime } from "@/lib/format";
import { outcomeLabels, type DisputeOutcome } from "@/lib/dispute-rules";
import Frame, { Panel } from "@/components/marketplace/Frame";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await pageGuard("ADMIN");
  const disputes = await db.dispute.findMany({
    orderBy: [{ resolvedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
    include: { payment: { select: { amount: true, request: { select: { title: true, client: { select: { name: true } }, acceptedPro: { select: { user: { select: { name: true } } } } } } } } },
  });
  return (
    <Frame actor={actor} title="Kontestet" subtitle="Të dyja deklaratat, detajet e punës dhe vendimi juaj. Afati i përgjigjes është 48 orë.">
      {!disputes.length && <Panel>Nuk ka konteste.</Panel>}
      {disputes.map((d) => (
        <Panel key={d.id}>
          <Link href={`/admin/kontestet/${d.id}`} className="text-lg font-bold text-gold-dark">{d.payment.request.title} →</Link>
          <p className="mt-1 text-sm">
            {d.payment.request.client.name} ↔ {d.payment.request.acceptedPro?.user.name ?? "—"} · {money(d.payment.amount)} · hapur {dateTime(d.createdAt)} nga {d.openedByRole === "PRO" ? "profesionisti" : "klienti"}
          </p>
          <p className="text-sm text-muted">
            {d.resolvedAt ? `Vendosur: ${outcomeLabels[d.outcome as DisputeOutcome] ?? d.outcome}` : d.response ? "Të dyja deklaratat janë gati për vendim" : `Në pritje të përgjigjes deri më ${d.respondBy ? dateTime(d.respondBy) : "—"}`}
          </p>
        </Panel>
      ))}
    </Frame>
  );
}
