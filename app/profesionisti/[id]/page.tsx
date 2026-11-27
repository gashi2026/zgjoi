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
import CategoryIcon from "@/components/CategoryIcon";
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
  const [actor, categories, flows] = await Promise.all([
    currentUser(),
    activeCategories(),
    Promise.all(pro.categories.map((c) => categoryFlow(db, c.categorySlug))),
  ]);
  // One entry per approved profession (primary first), each with its own hiring paths and price.
  const professions = pro.categories.map((c, i) => ({
    slug: c.categorySlug, priceFromCents: c.priceFromCents, flow: flows[i], terms: bookableTerms(pro, flows[i]),
    category: categories.find((x) => x.slug === c.categorySlug),
  }));
  const main = professions[0];
  const { flow, terms } = main;
  const many = professions.length > 1;
  const q = (slug: string) => `pro=${pro.id}&kategoria=${slug}`;
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
          {professions.map((p) => t.tx(p.category?.name)).join(" · ")} ·{" "}
          {pro.user.city}
        </p>
        <p className="mt-4 whitespace-pre-wrap">{pro.about}</p>
        <p className="mt-4 font-semibold">
          {!many && (main.priceFromCents ? t("proProfile.from", { amount: money(main.priceFromCents, t.locale) }) : t("proProfile.askForPrice"))}{" "}
          {pro.ratingCount
            ? t("proProfile.reviews", { value: pro.ratingAvg.toFixed(1), ratingCount: pro.ratingCount })
            : t("proProfile.noReviewsYet")}
        </p>
        {trust && <TrustDonut summary={trust} />}
        {!many && <p className="mt-2 text-sm text-muted">
          {terms
            ? t("proProfile.bookDirectlyHourlyRate", { amount: money(terms.rateCents, t.locale), label: t.tx(hoursLabel(terms.minMinutes)) })
            : t("proProfile.chatPrivatelyAboutJob")}
        </p>}
        {!many && flow.estimate && flow.estimatePriceCents && (
          <p className="mt-2 text-sm text-muted">
            {t("proProfile.notSureHowBig", { amount: money(flow.estimatePriceCents, t.locale), amount2: money(flow.estimatePriceCents, t.locale) })}</p>
        )}
        {!many && terms && (
          <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-gold/50 bg-white px-4 py-3 text-sm">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path d="M12 2 21 7v10l-9 5-9-5V7z" className="fill-gold" /></svg>
            <span className="font-semibold">{t("proProfile.hr", { amount: money(terms.rateCents, t.locale) })}</span>
            <span className="text-muted">{t("proProfile.minimumPaidUpfront", { label: t.tx(hoursLabel(terms.minMinutes)) })}</span>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-start gap-4">
          {!many && terms && (
            <Link
              className="rounded-full bg-gold px-5 py-3 font-semibold"
              href={`/rezervo-tani?${q(main.slug)}`}
            >
              {t("proProfile.bookNow")}</Link>
          )}
          {!many && <Link
            className={terms ? "rounded-full border-2 border-gold px-5 py-3 font-semibold" : "rounded-full bg-gold px-5 py-3 font-semibold"}
            href={`/kerkesa-e-re?${q(main.slug)}`}
          >
            {t("proProfile.startChat")}</Link>}
          {!many && flow.estimate && flow.estimatePriceCents && actor?.role !== "PRO" && (
            <Link
              className="rounded-full border-2 border-gold px-5 py-3 font-semibold"
              href={`/kerko-vleresim?${q(main.slug)}`}
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
      <section className="rounded-2xl border border-line p-6" data-testid="pro-professions">
        <h2 className="text-xl font-bold">{t("proProfile.professions")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {professions.map((p) => (
            <li key={p.slug} className="flex flex-col gap-3 rounded-2xl border border-line bg-cream/60 p-4">
              <div className="flex items-center gap-3">
                <span aria-hidden className="hexframe flex shrink-0 items-center justify-center bg-gold/30" style={{ width: 44, height: 50 }}>
                  <CategoryIcon name={p.category?.icon ?? "grid"} size={22} />
                </span>
                <div>
                  <p className="font-bold">{t.tx(p.category?.name)}</p>
                  <p className="text-sm">{p.priceFromCents ? t("proProfile.from", { amount: money(p.priceFromCents, t.locale) }) : <span className="text-muted">{t("proProfile.askForPrice")}</span>}
                    {p.terms ? ` · ${t("proProfile.hr", { amount: money(p.terms.rateCents, t.locale) })}` : ""}</p>
                </div>
              </div>
              {many && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {p.terms && <Link className="rounded-full bg-gold px-4 py-2 font-semibold" href={`/rezervo-tani?${q(p.slug)}`}>{t("proProfile.bookNow")}</Link>}
                  <Link className={`rounded-full px-4 py-2 font-semibold ${p.terms ? "border-2 border-gold" : "bg-gold"}`} href={`/kerkesa-e-re?${q(p.slug)}`}>{t("proProfile.startChat")}</Link>
                  {p.flow.estimate && p.flow.estimatePriceCents && actor?.role !== "PRO" && (
                    <Link className="rounded-full border-2 border-gold px-4 py-2 font-semibold" href={`/kerko-vleresim?${q(p.slug)}`}>
                      {t("proProfile.requestEstimate", { amount: money(p.flow.estimatePriceCents, t.locale) })}</Link>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        {professions.some((p) => !p.priceFromCents) && <p className="mt-3 text-sm text-muted">{t("proProfile.askForPriceHint")}</p>}
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
