import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { pageGuard } from "@/lib/server/guard";
import { money, dateTime, stateLabel } from "@/lib/format";
import { hoursLabel } from "@/lib/book-now";
import { entityId } from "@/lib/marketplace-validation";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ArrivalAdminPanel, { arrivalAdminSelect } from "@/components/marketplace/ArrivalAdminPanel";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
/** Admin view of one Book now booking (linked from the helpline message and alert). [id] is the job id. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  const parsed = entityId.safeParse((await params).id);
  if (!parsed.success) notFound();
  const b = await db.booking.findUnique({ where: { requestId: parsed.data }, include: {
    arrival: { select: arrivalAdminSelect },
    profile: { select: { slug: true, user: { select: { name: true, phone: true } } } },
    request: { select: { state: true, title: true, city: true, address: true, detail: true, client: { select: { name: true, phone: true } },
      payment: { select: { state: true, dispute: { select: { id: true } } } } } },
  } });
  if (!b) notFound();
  const r = b.request;
  return (
    <Frame actor={actor} title={t("admin.bookingTitle", { title: r.title })} subtitle={`${r.client.name} ↔ ${b.profile.user.name} · ${r.city}`}>
      <Panel>
        <h2 className="text-lg font-bold">{t("admin.booking")}</h2>
        <p className="mt-2 text-sm">{t("admin.hr", { label: t.tx(hoursLabel(b.minutes)), amount: money(b.hourlyRateCents, t.locale) })}{" "}<strong>{money(b.totalCents, t.locale)}</strong> {" "}{t("admin.starts", { date: dateTime(b.startsAt, t.locale) })}</p>
        <p className="text-sm">{t("admin.statusPayment", { label: t.tx(stateLabel(r.state)), label2: t.tx(stateLabel(r.payment?.state ?? "")) })}</p>
        <p className="text-sm">{t("admin.address")}{" "}{r.address || "—"}, {r.city}</p>
        <p className="text-sm">{t("admin.customer2", { name: r.client.name })}{" "}{r.client.phone || t("admin.noNumber")} {" "}{t("admin.pro2", { name: b.profile.user.name })}{" "}{b.profile.user.phone || t("admin.noNumber")}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{r.detail}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {r.payment?.dispute && <Link className="text-gold-dark" href={`/admin/kontestet/${r.payment.dispute.id}`}>{t("admin.dispute")}</Link>}
          <Link className="text-gold-dark" href="/admin/pagesat">{t("admin.paymentsTasks")}</Link>
        </div>
      </Panel>
      <ArrivalAdminPanel requestId={parsed.data} startsAt={b.startsAt} siteGeocode={b.siteGeocode} arrival={b.arrival}
        active={b.status === "CONFIRMED" && r.state === "BOOKED"} />
    </Frame>
  );
}
