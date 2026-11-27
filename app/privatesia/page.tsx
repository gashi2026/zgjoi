import { getT, pageMetadata } from "@/lib/i18n/server";
export const generateMetadata = () => pageMetadata({ title: "meta.privacyTitle", robots: { index: false, follow: false } });
export default async function Page() {
  const t = await getT();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold">{t("privacy.privacyDuringBeta")}</h1>
      <p className="rounded-xl bg-honey p-4">
        {t("privacy.operatorsFinalDetailsRetention")}</p>
      <p>
        {t("privacy.accountStoresNameEmail")}</p>
      <p>
        {t("privacy.nameCityDescriptionServices")}</p>
      <p>
        {t("privacy.cookiesUsedLoginAccess")}</p>
      <p>
        {t("privacy.requestAccessCorrectionDeletion")}</p>
    </article>
  );
}
