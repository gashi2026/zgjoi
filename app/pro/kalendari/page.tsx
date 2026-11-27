import Link from "@/components/i18n/Link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { dateTime } from "@/lib/format";
import { appointmentEnd } from "@/lib/appointments";
import Frame, { Panel } from "@/components/marketplace/Frame";
import AvailabilityEditor from "@/components/marketplace/AvailabilityEditor";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  const actor = await pageGuard("PRO");
  const profileId = actor.proProfile?.id ?? "missing";
  const [days, quotes] = await Promise.all([
    db.availability.findMany({ where: { profileId } }),
    db.quote.findMany({
      where: {
        profileId,
        state: "ACCEPTED",
        scheduledAt: { gte: new Date() },
        request: { state: { in: ["BOOKED", "IN_PROGRESS"] } },
      },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            payment: { select: { state: true } },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 100,
    }),
  ]);
  return (
    <Frame actor={actor} title={t("pro.calendar")}>
      <Panel>
        <h2 className="mb-4 text-lg font-bold">{t("pro.upcomingJobs")}</h2>
        {!quotes.length && <p>{t("pro.noJobsScheduledYet")}</p>}
        {quotes.map((q) => (
          <p key={q.id} className="my-3">
            <Link
              href={`/pro/kerkesat/${q.requestId}`}
              className="text-gold-dark"
            >
              {t.tx(q.request.title)}
            </Link>{" "}
            · {q.scheduledAt && dateTime(q.scheduledAt, t.locale)}
            {q.scheduledAt && appointmentEnd(q.scheduledAt, q.duration) && <> – {dateTime(appointmentEnd(q.scheduledAt, q.duration)!, t.locale)}</>} ·{" "}
            {q.request.payment?.state === "HELD"
              ? t("pro.paymentConfirmed")
              : t("pro.awaitingPayment")}
          </p>
        ))}
      </Panel>
      <Panel>
        <AvailabilityEditor days={days} />
      </Panel>
    </Frame>
  );
}
