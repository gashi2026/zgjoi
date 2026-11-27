import type { Metadata } from "next";
import HowItWorks from "@/components/HowItWorks";
import WhyZgjoi from "@/components/WhyZgjoi";
import CTABanner from "@/components/CTABanner";
import { getT, pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageMetadata({ title: "meta.howItWorksTitle", description: "meta.howItWorksDescription" });

export default async function SiFunksiononPage() {
  const t = await getT();
  return (
    <>
      <div className="bg-cream pt-14">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {t("howItWorks.howWorks")}{" "}<span className="text-gold">{t("howItWorks.zgjoi")}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted">
            {t("howItWorks.fromSearchReviewEverything")}</p>
        </div>
      </div>
      <HowItWorks heading={false} />
      <WhyZgjoi />
      <CTABanner />
    </>
  );
}
