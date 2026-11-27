import Link from "@/components/i18n/Link";
import HowItWorks from "@/components/HowItWorks";
import { getT, pageMetadata } from "@/lib/i18n/server";
export const generateMetadata = () => pageMetadata({ title: "meta.forProsTitle" });
export default async function Page() {
  const t = await getT();
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold">
          {t("forPros.buildProfessionalProfile")}</h1>
        <p className="mt-5 text-lg text-muted">
          {t("forPros.customersFindSearchLook")}</p>
        <ul className="my-6 list-disc space-y-3 pl-5">
          <li>{t("forPros.completeProfileServicesCities")}</li>
          <li>{t("forPros.profileReviewedBeforeIts")}</li>
          <li>{t("forPros.everyOfferHasPrice")}</li>
          <li>{t("forPros.waitPaymentConfirmationBefore")}</li>
          <li>
            {t("forPros.customerConfirmsCompletionBefore")}</li>
        </ul>
        <p className="mb-6 rounded-xl bg-honey p-4">
          {t("forPros.onlinePaymentsStillBeing")}</p>
        <Link
          href="/regjistrohu-profesionist"
          className="inline-block rounded-full bg-gold px-6 py-3 font-semibold"
        >
          {t("forPros.signUpPro")}</Link>
      </section>
      <HowItWorks />
    </div>
  );
}
