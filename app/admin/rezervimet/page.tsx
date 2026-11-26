import Link from "next/link";
import { db } from "@/lib/server/db";
import { pageGuard } from "@/lib/server/guard";
import { money, dateTime, clockTime, stateLabel } from "@/lib/format";
import { hoursLabel } from "@/lib/book-now";
import { contactLabels, waitMinutesLeft, type ContactResult } from "@/lib/arrival";
import Frame, { Panel } from "@/components/marketplace/Frame";
export const dynamic = "force-dynamic";
/** Book now bookings around today, helpline calls first. */
export default async function Page() {
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
      <Link href={`/admin/rezervimet/${b.requestId}`} className="text-lg font-bold text-gold-dark">{b.request.title} →</Link>
      <p className="mt-1 text-sm">{b.request.client.name} ↔ {b.profile.user.name} · {b.request.city} · {hoursLabel(b.minutes)} · {money(b.totalCents)} · fillimi {dateTime(b.startsAt)} · {stateLabel(b.request.state)}</p>
      <p className="text-sm text-muted">
        {b.arrival ? `Arriti ${clockTime(b.arrival.checkedInAt)}${b.arrival.method === "PHOTO" ? " (me foto)" : ""}` : "Pa “Arrita”"}
        {b.arrival?.helplineAt ? ` · ndihma ${clockTime(b.arrival.helplineAt)}${waitMinutesLeft(b.arrival, now) ? ` · pritja ${waitMinutesLeft(b.arrival, now)} min` : ""}` : ""}
        {b.arrival?.contactResult ? ` · ${contactLabels[b.arrival.contactResult as ContactResult] ?? b.arrival.contactResult}` : ""}
      </p>
    </Panel>
  );
  return (
    <Frame actor={actor} title="Rezervimet" subtitle="Rezervo tani: arritjet, thirrjet e ndihmës dhe kontakti me klientin.">
      {helpNow.length > 0 && <h2 className="text-lg font-bold">Kërkojnë ndihmë tani</h2>}
      {helpNow.map(row)}
      {!bookings.length && <Panel>Nuk ka rezervime këto ditë.</Panel>}
      {rest.map(row)}
    </Frame>
  );
}
