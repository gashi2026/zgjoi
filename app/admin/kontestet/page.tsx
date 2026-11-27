import Link from "@/components/i18n/Link";
import { db } from "@/lib/server/db";
import { pageGuard } from "@/lib/server/guard";
import { money, dateTime } from "@/lib/format";
import { outcomeLabels, type DisputeOutcome } from "@/lib/dispute-rules";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  const disputes = await db.dispute.findMany({
    orderBy: [{ resolvedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
    include: { payment: { select: { amount: true, request: { select: { title: true, client: { select: { name: true } }, acceptedPro: { select: { user: { select: { name: true } } } } } } } } },
  });
  return (
    <Frame actor={actor} title={t("admin.disputes")} subtitle={t("admin.bothStatementsJobDetails")}>
      {!disputes.length && <Panel>{t("admin.noDisputes")}</Panel>}
      {disputes.map((d) => (
        <Panel key={d.id}>
          <Link href={`/admin/kontestet/${d.id}`} className="text-lg font-bold text-gold-dark">{t.tx(d.payment.request.title)} →</Link>
          <p className="mt-1 text-sm">
            {t("admin.opened", { name: d.payment.request.client.name, value: d.payment.request.acceptedPro?.user.name ?? "—", amount: money(d.payment.amount, t.locale), date: dateTime(d.createdAt, t.locale) })}{" "}{d.openedByRole === "PRO" ? "profesionisti" : "klienti"}
          </p>
          <p className="text-sm text-muted">
            {d.resolvedAt ? t("admin.decided", { value: outcomeLabels[d.outcome as DisputeOutcome] ?? d.outcome }) : d.response ? t("admin.bothStatementsReadyDecision") : t("admin.waitingReplyUntil", { value: d.respondBy ? dateTime(d.respondBy, t.locale) : "—" })}
          </p>
        </Panel>
      ))}
    </Frame>
  );
}
