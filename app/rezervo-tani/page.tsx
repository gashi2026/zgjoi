import { localRedirect } from "@/lib/i18n/redirect";
import { msgKey } from "@/lib/i18n/translate";
import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { publicProfile } from "@/lib/server/catalog";
import { db } from "@/lib/server/db";
import { categoryFlow, bookableTerms } from "@/lib/server/bookings";
import { money } from "@/lib/format";
import { serviceCategory } from "@/lib/service-categories";
import { bookingTotal, hourOptions, hoursLabel, estimateCredit, LATE_FEE_CENTS, FREE_CANCEL_HOURS } from "@/lib/book-now";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import { IdGate } from "@/components/verification/IdNotice";
import { SERIES_CADENCES, cadenceOptionLabels, GENERATION_HORIZON_DAYS, MIN_AHEAD_DAYS } from "@/lib/recurring-series";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
const weekdays = [msgKey("bookNow.monday"), msgKey("bookNow.tuesday"), msgKey("bookNow.wednesday"), msgKey("bookNow.thursday"), msgKey("bookNow.friday"), msgKey("bookNow.saturday"), msgKey("bookNow.sunday")];
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** Book now (hourly): the customer picks a start and hours at or above the
 * pro's minimum; total = rate × hours, paid upfront (beta: confirmed by Zgjoi). */
export default async function Page({ searchParams }: { searchParams: Promise<{ pro?: string; kategoria?: string }> }) {
  const t = await getT();
  const actor = await pageGuard("CLIENT");
  const { pro: id, kategoria } = await searchParams;
  if (!id) return localRedirect("/kerko");
  const pro = await publicProfile(id);
  if (!pro) notFound();
  // Book now is per profession: the one asked for when it offers Book now, else the first that does.
  const flows = await Promise.all(pro.categories.map((c) => categoryFlow(db, c.categorySlug)));
  const bookable = pro.categories.flatMap((c, i) => { const tm = bookableTerms(pro, flows[i], c); return tm ? [{ slug: c.categorySlug, terms: tm }] : []; });
  const chosen = bookable.find((b) => b.slug === serviceCategory(kategoria ?? "")?.slug) ?? bookable[0];
  if (!chosen) return localRedirect(`/kerkesa-e-re?pro=${pro.id}${kategoria ? `&kategoria=${encodeURIComponent(kategoria)}` : ""}`);
  const terms = chosen.terms;
  const estimates = await db.estimate.findMany({ where: { clientId: actor.id, profileId: pro.id, state: "PAID", creditedRequestId: null } });
  const credit = estimateCredit(estimates, actor.id, pro.id);
  const category = t.tx(serviceCategory(chosen.slug)?.name ?? chosen.slug);
  return (
    <Frame actor={actor} title={t("bookNow.bookNow", { name: pro.user.name })}
      subtitle={t("bookNow.hrMinimumTotalRate", { category: category, amount: money(terms.rateCents, t.locale), label: t.tx(hoursLabel(terms.minMinutes)) })}>
      <Panel>
        <h2 className="mb-1 text-lg font-bold">{t("bookNow.chooseTimeHours")}</h2>
        <p className="mb-4 text-sm text-muted">
          {t("bookNow.bookingPaidUpfrontDuring", { name: pro.user.name })}</p>
        {credit.creditCents > 0 && (
          <p className="mb-4 rounded-xl bg-honey p-3 text-sm font-semibold" role="status">
            {t("bookNow.youvePaidEstimatePro", { amount: money(credit.creditCents, t.locale) })}</p>
        )}
        <IdGate actor={actor}>
        <ApiForm endpoint="/api/bookings" idempotent values={{ profileId: pro.id, categorySlug: chosen.slug }} label={t("bookNow.bookNow2")}
          confirmation={t("bookNow.bookTotalBasedHr", { name: pro.user.name, amount: money(terms.rateCents, t.locale) })}
          fields={[
            { name: "startsAt", label: t("bookNow.startDateTimeKosovo"), type: "datetime-local", kosovoTime: true, required: true,
              hint: t("bookNow.leastHourFromNow") },
            { name: "minutes", label: t("bookNow.howManyHours"), type: "select", as: "number", required: true, value: String(terms.minMinutes),
              options: hourOptions(terms.minMinutes).map(m => ({ value: String(m), label: `${t.tx(hoursLabel(m))} · ${money(bookingTotal(terms.rateCents, m), t.locale)}` })) },
            { name: "repeat", label: t("bookNow.repeat"), type: "select", value: "NONE",
              options: [{ value: "NONE", label: t("bookNow.justOnce") }, ...SERIES_CADENCES.map(c => ({ value: c, label: t.tx(cadenceOptionLabels[c]) }))],
              hint: t("bookNow.recurringBookingEachVisit", { GENERATION_HORIZON_DAYS: GENERATION_HORIZON_DAYS, MIN_AHEAD_DAYS: MIN_AHEAD_DAYS }) },
            { name: "detail", label: t("bookNow.whatNeedsDoing"), type: "textarea", required: true, minLength: 10, maxLength: 4000,
              hint: t("bookNow.noPhoneNumbersEmails") },
            { name: "city", label: t("bookNow.city"), value: actor.city ?? "", required: true, maxLength: 60 },
            { name: "address", label: t("bookNow.address"), maxLength: 300, hint: t("bookNow.shownProOncePayment") },
          ]} />
        </IdGate>
      </Panel>
      <Panel>
        <h2 className="font-bold">{t("bookNow.sWeeklyHours", { name: pro.user.name })}</h2>
        {pro.availability.length ? (
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {[...pro.availability].sort((a, b) => a.weekday - b.weekday).map(a => (
              <li key={a.weekday}>{t(weekdays[a.weekday])}: {clock(a.startMin)}–{clock(a.endMin)}</li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">{t("bookNow.proHasntSetWeekly")}</p>}
      </Panel>
      <Panel>
        <h2 className="font-bold">{t("bookNow.cancellation")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>{t("bookNow.moreThanHoursBefore", { FREE_CANCEL_HOURS: FREE_CANCEL_HOURS })}</li>
          <li>{t("bookNow.withinHoursFlatFee", { FREE_CANCEL_HOURS: FREE_CANCEL_HOURS, amount: money(LATE_FEE_CENTS, t.locale) })}</li>
          <li>{t("bookNow.ifProCancelsLate")}</li>
          <li>{t("bookNow.ifNobodysHomeWhen", { amount: money(LATE_FEE_CENTS, t.locale) })}</li>
        </ul>
        <p className="mt-3 text-sm text-muted">{t("bookNow.duringBetaRefundsHandled")}{" "}<Link className="text-gold-dark" href={`/profesionisti/${pro.slug}`}>{t("bookNow.backProfile")}</Link></p>
      </Panel>
    </Frame>
  );
}
