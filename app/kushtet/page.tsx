import { getT, pageMetadata } from "@/lib/i18n/server";
export const generateMetadata = () => pageMetadata({ title: "meta.termsTitle", robots: { index: false, follow: false } });
export default async function Page() {
  const t = await getT();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold">{t("terms.useDuringBeta")}</h1>
      <p className="rounded-xl bg-honey p-4">
        {t("terms.zgjoiGettingReadyLaunch")}</p>
      <section>
        <h2 className="text-xl font-bold">{t("terms.requestsOffers")}</h2>
        <p className="mt-2">
          {t("terms.requestGoesOnlyPro")}</p>
      </section>
      <section>
        <h2 className="text-xl font-bold">{t("terms.detailsConduct")}</h2>
        <p className="mt-2">
          {t("terms.useAccurateDetailsDont")}</p>
      </section>
      <section>
        <h2 className="text-xl font-bold">{t("terms.completionReviews")}</h2>
        <p className="mt-2">
          {t("terms.onlyCustomerConfirmsCompletion")}</p>
      </section>
      <p className="text-sm text-muted">
        {t("terms.noticeDescribesTestEnvironment")}</p>
    </article>
  );
}
