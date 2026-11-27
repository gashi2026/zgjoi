import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { publicProfile, activeCategories } from "@/lib/server/catalog";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { money, dateTime } from "@/lib/format";
import ApiForm from "@/components/marketplace/ApiForm";
import { categoryFlow, bookableTerms } from "@/lib/server/bookings";
import { hoursLabel } from "@/lib/book-now";
import { proTrust } from "@/lib/server/trust";
import { TRUST_PUBLIC } from "@/lib/trust";
import TrustDonut from "@/components/marketplace/TrustDonut";
import { getT, pageMetadata } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const { id } = await params;
  const pro = await publicProfile(id);
  return {
    title: pro
      ? `${pro.user.name} — ${pro.user.city} | Zgjoi`
      : t("proProfile.profileNotFoundZgjoi"),
    description: pro?.about.slice(0, 160),
    alternates: (await pageMetadata({ canonical: pro ? `/profesionisti/${pro.slug}` : "/kerko" })).alternates,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const { id } = await params;
  const pro = await publicProfile(id);
  if (!pro) notFound();
  const [actor, categories, flow] = await Promise.all([
    currentUser(),
    activeCategories(),
    categoryFlow(db, pro.categorySlug),
  ]);
  const terms = bookableTerms(pro, flow);
  const trust = TRUST_PUBLIC ? await proTrust(pro.id) : null;
  const saved =
    actor?.role === "CLIENT"
      ? Boolean(
          await db.favorite.findUnique({
            where: {
              userId_profileId: { userId: actor.id, profileId: pro.id },
            },
          }),
        )
      : false;
  const weekdays = [
    t("proProfile.monday"),
    t("proProfile.tuesday"),
    t("proProfile.wednesday"),
    t("proProfile.thursday"),
    t("proProfile.friday"),
    t("proProfile.saturday"),
    t("proProfile.sunday"),
  ];
  const clock = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Link href="/kerko" className="text-gold-dark">
        {t("proProfile.backSearch")}</Link>
      <section className="rounded-2xl border border-line bg-cream p-6">
        <h1 className="text-3xl font-bold">{pro.user.name}</h1>
        <p className="mt-2 text-muted">
          {t.tx(categories.find((c) => c.slug === pro.categorySlug)?.name)} ·{" "}
          {pro.user.city}
        </p>
        <p className="mt-4 whitespace-pre-wrap">{pro.about}</p>
        <p className="mt-4 font-semibold">
          {t("proProfile.from", { amount: money(pro.priceFrom, t.locale) })}{" "}
          {pro.ratingCount
            ? t("proProfile.reviews", { value: pro.ratingAvg.toFixed(1), ratingCount: pro.ratingCount })
            : t("proProfile.noReviewsYet")}
        </p>
        {trust && <TrustDonut summary={trust} />}
        <p className="mt-2 text-sm text-muted">
          {terms
            ? t("proProfile.bookDirectlyHourlyRate", { amount: money(terms.rateCents, t.locale), label: t.tx(hoursLabel(terms.minMinutes)) })
            : t("proProfile.chatPrivatelyAboutJob")}
        </p>
        {flow.estimate && flow.estimatePriceCents && (
          <p className="mt-2 text-sm text-muted">
            {t("proProfile.notSureHowBig", { amount: money(flow.estimatePriceCents, t.locale), amount2: money(flow.estimatePriceCents, t.locale) })}</p>
        )}
        {terms && (
          <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-gold/50 bg-white px-4 py-3 text-sm">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path d="M12 2 21 7v10l-9 5-9-5V7z" className="fill-gold" /></svg>
            <span className="font-semibold">{t("proProfile.hr", { amount: money(terms.rateCents, t.locale) })}</span>
            <span className="text-muted">{t("proProfile.minimumPaidUpfront", { label: t.tx(hoursLabel(terms.minMinutes)) })}</span>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-start gap-4">
          {terms && (
            <Link
              className="rounded-full bg-gold px-5 py-3 font-semibold"
              href={`/rezervo-tani?pro=${pro.id}`}
            >
              {t("proProfile.bookNow")}</Link>
          )}
          <Link
            className={terms ? "rounded-full border-2 border-gold px-5 py-3 font-semibold" : "rounded-full bg-gold px-5 py-3 font-semibold"}
            href={`/kerkesa-e-re?pro=${pro.id}`}
          >
            {t("proProfile.startChat")}</Link>
          {flow.estimate && flow.estimatePriceCents && actor?.role !== "PRO" && (
            <Link
              className="rounded-full border-2 border-gold px-5 py-3 font-semibold"
              href={`/kerko-vleresim?pro=${pro.id}`}
            >
              {t("proProfile.requestEstimate", { amount: money(flow.estimatePriceCents, t.locale) })}</Link>
          )}
          {actor?.role === "CLIENT" && (
            <ApiForm
              endpoint="/api/favorites"
              values={{ profileId: pro.id, saved: !saved }}
              label={
                saved ? t("proProfile.removeFromFavourites") : t("proProfile.saveFavourites")
              }
            />
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-line p-6">
        <h2 className="text-xl font-bold">{t("proProfile.servicesArea")}</h2>
        <p className="mt-2">{pro.serviceCities.join(", ") || pro.user.city}</p>
        {pro.services.map((s) => (
          <p key={s.id} className="mt-2">
            {t("proProfile.from2", { name: s.name, amount: money(s.price, t.locale) })}</p>
        ))}
        <h3 className="mt-5 font-bold">{t("proProfile.usualHours")}</h3>
        <p className="text-sm text-muted">
          {t("proProfile.hoursDontGuaranteeAvailability")}</p>
        {pro.availability.length ? (
          pro.availability
            .sort((a, b) => a.weekday - b.weekday)
            .map((a) => (
              <p key={a.weekday}>
                {weekdays[a.weekday]}: {clock(a.startMin)}–{clock(a.endMin)}
              </p>
            ))
        ) : (
          <p>{t("proProfile.discussSchedulePro")}</p>
        )}
      </section>
      <section>
        <h2 className="text-xl font-bold">
          {t("proProfile.reviewsFromCompletedJobs")}</h2>
        {!pro.reviews.length && (
          <p className="mt-3 text-muted">
            {t("proProfile.proHasNoReviews")}</p>
        )}
        {pro.reviews.map((r) => (
          <article
            key={r.id}
            className="mt-4 rounded-2xl border border-line p-5"
          >
            <p className="font-semibold">
              {r.author.name
                .split(/\s+/)
                .map((n) => n[0])
                .join(".")}
              . · {r.rating}/5
            </p>
            <p className="mt-2 whitespace-pre-wrap">{r.text}</p>
            <time className="text-xs text-muted">{dateTime(r.createdAt, t.locale)}</time>
          </article>
        ))}
      </section>
    </div>
  );
}
