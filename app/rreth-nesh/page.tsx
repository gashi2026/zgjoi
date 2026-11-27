import { msgKey } from "@/lib/i18n/translate";
import type { Metadata } from "next";
import { Quote, ShieldCheck, Star, Users, Zap } from "lucide-react";
import { serviceCategories } from "@/lib/service-categories";
import { getT, pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageMetadata({ title: "meta.aboutTitle", description: "meta.aboutDescription" });

const values = [
  {
    icon: ShieldCheck,
    title: msgKey("about.trust"),
    body: msgKey("about.profilesReviewedBeforeTheyre"),
  },
  {
    icon: Star,
    title: msgKey("about.quality"),
    body: msgKey("about.reviewsGenuineTheyCan"),
  },
  {
    icon: Zap,
    title: msgKey("about.speed"),
    body: msgKey("about.contactProDirectlyTalk"),
  },
  {
    icon: Users,
    title: msgKey("about.range"),
    body: msgKey("about.categoriesAllKindsServices"),
  },
];

export default async function RrethNeshPage() {
  const t = await getT();
  return (
    <>
      <div>
        {/* Hero */}
        <section className="bg-cream">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {t("about.aboutZgjoi")}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              {t("about.zgjoiConnectsPeopleKosovo")}</p>
          </div>
        </section>

        {/* Mission */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-line bg-cream p-8 sm:p-12">
              <Quote size={28} className="text-gold" />
              <p className="mt-4 text-xl font-semibold leading-relaxed text-ink sm:text-2xl">
                {t("about.kosovoHasExcellentPros")}</p>
              <p className="mt-6 text-base leading-relaxed text-muted">
                {t("about.ideaCameFromSimple")}</p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-cream">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {t("about.whatWeBelieve")}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {values.map((v) => (
                <div
                  key={t(v.title)}
                  className="rounded-2xl border border-line bg-white p-6 shadow-soft"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey">
                    <v.icon size={20} className="text-gold-dark" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-ink">
                    {t(v.title)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {t(v.body)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {t("about.zgjoiToday")}</h2>
            <p className="mt-2 text-sm text-muted">
              {t("about.wereJustGettingStarted")}</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { v: String(serviceCategories.length), l: t("about.serviceCategories") },
                { v: t("about.beta"), l: t("about.openingUpGraduallyAcross") },
                { v: t("about.n11"), l: t("about.privateChatProChoose") },
                { v: t("about.review"), l: t("about.profilesApprovedBeforeTheyre") },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-2xl border border-line bg-cream p-6 text-center"
                >
                  <p className="text-3xl font-extrabold text-ink">{s.v}</p>
                  <p className="mt-2 text-sm text-muted">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-cream">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold text-ink">{t("about.contactUs")}</h2>
            <p className="mt-3 text-muted">
              {t("about.questionsPartnershipsFeedbackWere")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <a
                href="mailto:info@zgjoi.com"
                className="rounded-full bg-gold px-7 py-3 text-sm font-bold text-ink hover:bg-gold-dark"
              >
                {t("about.infoZgjoiCom")}</a>
              <a
                href="/kerko"
                className="rounded-full border border-line bg-white px-7 py-3 text-sm font-semibold text-ink hover:border-gold"
              >
                {t("about.findPro")}</a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
