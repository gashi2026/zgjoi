import Link from "@/components/i18n/Link";
import { getT } from "@/lib/i18n/server";
export default async function NotFound() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t("home.pageNotFound")}</h1>
      <Link href="/kerko" className="mt-5 inline-block text-gold-dark">
        {t("home.findPros")}</Link>
    </div>
  );
}
