import Link from "next/link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { dateTime } from "@/lib/format";
import { appointmentEnd } from "@/lib/appointments";
import Frame, { Panel } from "@/components/marketplace/Frame";
import AvailabilityEditor from "@/components/marketplace/AvailabilityEditor";
export default async function Page() {
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
    <Frame actor={actor} title="Kalendari">
      <Panel>
        <h2 className="mb-4 text-lg font-bold">Punët e ardhshme</h2>
        {!quotes.length && <p>Nuk ka punë të planifikuara ende.</p>}
        {quotes.map((q) => (
          <p key={q.id} className="my-3">
            <Link
              href={`/pro/kerkesat/${q.requestId}`}
              className="text-gold-dark"
            >
              {q.request.title}
            </Link>{" "}
            · {q.scheduledAt && dateTime(q.scheduledAt)}
            {q.scheduledAt && appointmentEnd(q.scheduledAt, q.duration) && <> – {dateTime(appointmentEnd(q.scheduledAt, q.duration)!)}</>} ·{" "}
            {q.request.payment?.state === "HELD"
              ? "Pagesa u konfirmua"
              : "Në pritje të pagesës"}
          </p>
        ))}
      </Panel>
      <Panel>
        <AvailabilityEditor days={days} />
      </Panel>
    </Frame>
  );
}
