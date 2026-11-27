import { msgKey } from "@/lib/i18n/translate";
import { ShieldCheck, Star, BadgeEuro, Headphones } from "lucide-react";
import { HexOutline } from "./Brand";
import { getT } from "@/lib/i18n/server";

const features = [
  {
    icon: ShieldCheck,
    title: msgKey("whyZgjoi.vettedProfiles"),
    text: msgKey("whyZgjoi.proProfilesReviewedBefore"),
  },
  {
    icon: Star,
    title: msgKey("whyZgjoi.genuineRatingsReviews"),
    text: msgKey("whyZgjoi.onlyCustomersWhoHave"),
  },
  {
    icon: BadgeEuro,
    title: msgKey("whyZgjoi.clearFairPrices"),
    text: msgKey("whyZgjoi.prosOfferIncludesPrice"),
  },
  {
    icon: Headphones,
    title: msgKey("whyZgjoi.safetySupport"),
    text: msgKey("whyZgjoi.useSupportChatQuestions"),
  },
];

export default async function WhyZgjoi() {
  const t = await getT();
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {t("whyZgjoi.whyZgjoi")}</h2>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <HexOutline
                size={78}
                stroke="#FFB800"
                strokeWidth={2.5}
                fill="#FFFCF5"
              >
                <Icon size={28} className="text-gold-dark" strokeWidth={1.8} />
              </HexOutline>
              <h3 className="mt-4 text-base font-bold text-ink">{t(title)}</h3>
              <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">
                {t(text)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
