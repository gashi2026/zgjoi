import Link from "@/components/i18n/Link";
import { db } from "@/lib/server/db";
import type { Actor } from "@/lib/server/auth";
import { money, dateTime } from "@/lib/format";
import { bookingTotal, hoursLabel, FREE_CANCEL_HOURS, LATE_FEE_CENTS } from "@/lib/book-now";
import { seriesLabel, seriesStatusLabels, GENERATION_HORIZON_DAYS, seriesCommissionBps } from "@/lib/recurring-series";
import { serviceCategory } from "@/lib/service-categories";
import { Panel } from "./Frame";
import ApiForm from "./ApiForm";
import { getT } from "@/lib/i18n/server";

/** Customer and pro view of their recurring Book now schedules. */
export default async function SeriesList({ actor }: { actor: Actor }) {
  const t = await getT();
  const pro = actor.role === "PRO";
  const now = new Date();
  const list = await db.recurringSeries.findMany({
    where: pro ? { profileId: actor.proProfile?.id ?? "missing" } : { clientId: actor.id },
    orderBy: [{ createdAt: "desc" }], take: 50,
    include: {
      profile: { select: { slug: true, user: { select: { name: true } } } },
      bookings: { where: { startsAt: { gte: new Date(now.getTime() - 86_400_000) } }, orderBy: { startsAt: "asc" }, take: 6,
        select: { id: true, requestId: true, startsAt: true, status: true, totalCents: true, request: { select: { payment: { select: { state: true } } } } } },
    },
  });
  const clients = pro ? new Map((await db.user.findMany({ where: { id: { in: list.map(s => s.clientId) } }, select: { id: true, name: true } })).map(u => [u.id, u.name])) : null;
  const order = ["PROPOSED", "ACTIVE", "PAUSED", "CANCELLED", "DECLINED"];
  list.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const jobHref = (requestId: string) => `${pro ? "/pro" : "/llogaria"}/kerkesat/${requestId}`;
  return (
    <>
      <Panel>
        <h2 className="text-lg font-bold">{t("seriesList.howWorks")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>{t("seriesList.sameDayTimeEvery", { GENERATION_HORIZON_DAYS: GENERATION_HORIZON_DAYS })}</li>
          <li>{t("seriesList.cancellingVisitFreeUp", { FREE_CANCEL_HOURS: FREE_CANCEL_HOURS, amount: money(LATE_FEE_CENTS, t.locale) })}</li>
          <li>{t("seriesList.pausingCancellingSeriesCancels", { FREE_CANCEL_HOURS: FREE_CANCEL_HOURS, FREE_CANCEL_HOURS2: FREE_CANCEL_HOURS })}</li>
          {pro && <li>{t("seriesList.zgjoisCommissionFirstVisit", { value: seriesCommissionBps("pastrim") / 100 })}</li>}
        </ul>
      </Panel>
      {!list.length && (
        <Panel>
          <p className="text-sm text-muted">
            {pro
              ? t("seriesList.dontHaveAnyRecurring")
              : t("seriesList.dontHaveAnyRecurring2")}
          </p>
        </Panel>
      )}
      {list.map(s => {
        const who = pro ? clients?.get(s.clientId) ?? t("seriesList.customer") : s.profile.user.name;
        const category = serviceCategory(s.categorySlug)?.name ?? s.categorySlug;
        return (
          <Panel key={s.id}>
            <article aria-label={t("seriesList.recurringBooking", { who: who })}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{category} · {who}</p>
                <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">{t.tx(seriesStatusLabels[s.status]) ?? s.status}</span>
              </div>
              <p className="mt-2 text-lg font-bold">{t.tx(seriesLabel(s))}</p>
              <p className="text-sm">{t("seriesList.hr", { label: t.tx(hoursLabel(s.minutes)), amount: money(s.hourlyRateCents, t.locale) })}{" "}<strong>{money(bookingTotal(s.hourlyRateCents, s.minutes), t.locale)}</strong> {" "}{t("seriesList.perVisit")}</p>
              <p className="text-xs text-muted">{t("seriesList.from", { date: dateTime(s.firstStartsAt, t.locale), city: s.city })}{s.proposedBy === "PRO" ? t("seriesList.proposedPro") : ""}</p>
              {s.statusNote && <p className="mt-2 rounded-xl bg-cream p-2 text-sm" role="status">{s.statusNote}</p>}
              {s.bookings.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {s.bookings.map(b => (
                    <li key={b.id}>
                      <Link className="text-gold-dark underline" href={jobHref(b.requestId)}>{dateTime(b.startsAt, t.locale)}</Link>
                      {" · "}{money(b.totalCents, t.locale)} · {b.status === "CANCELLED" ? t("seriesList.cancelled") : b.request.payment?.state === "HELD" ? t("seriesList.paid") : t("seriesList.paymentPending")}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                {s.status === "PROPOSED" && !pro && <>
                  <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "CONFIRM" }} label={t("seriesList.confirmRecurringBooking")}
                    confirmation={t("seriesList.confirmEachVisitPaid", { label: t.tx(seriesLabel(s)) })} />
                  <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "DECLINE" }} label={t("seriesList.noThanks")} />
                </>}
                {s.status === "PROPOSED" && pro && <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "CANCEL" }} label={t("seriesList.withdrawProposal")} />}
                {s.status === "ACTIVE" && <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "PAUSE" }} label={t("seriesList.pause")}
                  confirmation={t("seriesList.visitsMoreThan24")} />}
                {s.status === "PAUSED" && <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "RESUME" }} label={t("seriesList.resume")} />}
                {["ACTIVE", "PAUSED"].includes(s.status) && <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "CANCEL" }} label={t("seriesList.cancelSeries")}
                  confirmation={t("seriesList.cancelRecurringBookingVisits")} />}
              </div>
            </article>
          </Panel>
        );
      })}
    </>
  );
}
