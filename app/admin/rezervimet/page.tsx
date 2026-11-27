import Link from "@/components/i18n/Link";
import { db } from "@/lib/server/db";
import { pageGuard } from "@/lib/server/guard";
import { money, dateTime, clockTime, stateLabel } from "@/lib/format";
import { hoursLabel } from "@/lib/book-now";
import { contactLabels, waitMinutesLeft, type ContactResult } from "@/lib/arrival";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
/** Book now bookings around today, helpline calls first. */
export default async function Page() {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  const now = new Date();
  const bookings = await db.booking.findMany({
    where: { OR: [{ startsAt: { gte: new Date(now.getTime() - 2 * 86_400_000), lte: new Date(now.getTime() + 7 * 86_400_000) } }, { arrival: { helplineAt: { not: null } } }] },
    orderBy: { startsAt: "asc" }, take: 200,
    include: { arrival: { select: { checkedInAt: true, method: true, helplineAt: true, waitEndsAt: true, contactResult: true } },
      profile: { select: { user: { select: { name: true } } } }, request: { select: { state: true, title: true, city: true, client: { select: { name: true } } } } },
  });
  const helpNow = bookings.filter(b => b.arrival?.helplineAt && !b.arrival.contactResult && b.request.state === "BOOKED");
  const rest = bookings.filter(b => !helpNow.includes(b));
  const row = (b: (typeof bookings)[number]) => (
    <Panel key={b.id}>
      <Link href={`/admin/rezervimet/${b.requestId}`} className="text-lg font-bold text-gold-dark">{t.tx(b.request.title)} →</Link>
      <p className="mt-1 text-sm">{t("admin.starts2", { name: b.request.client.name, name2: b.profile.user.name, city: b.request.city, label: t.tx(hoursLabel(b.minutes)), amount: money(b.totalCents, t.locale), date: dateTime(b.startsAt, t.locale), label2: t.tx(stateLabel(b.request.state)) })}</p>
      <p className="text-sm text-muted">
        {b.arrival ? t("admin.arrived", { time: clockTime(b.arrival.checkedInAt, t.locale), value: b.arrival.method === "PHOTO" ? t("admin.withPhotoSuffix") : "" }) : t("admin.noCheck")}
        {b.arrival?.helplineAt ? ` · ndihma ${clockTime(b.arrival.helplineAt, t.locale)}${waitMinutesLeft(b.arrival, now) ? ` · pritja ${waitMinutesLeft(b.arrival, now)} min` : ""}` : ""}
        {b.arrival?.contactResult ? ` · ${t.tx(contactLabels[b.arrival.contactResult as ContactResult]) ?? b.arrival.contactResult}` : ""}
      </p>
    </Panel>
  );
  return (
    <Frame actor={actor} title={t("admin.bookings")} subtitle={t("admin.bookNowArrivalsHelpline")}>
      {helpNow.length > 0 && <h2 className="text-lg font-bold">{t("admin.needHelpNow")}</h2>}
      {helpNow.map(row)}
      {!bookings.length && <Panel>{t("admin.noBookingsTheseDays")}</Panel>}
      {rest.map(row)}
    </Frame>
  );
}
