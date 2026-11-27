import Link from "@/components/i18n/Link";
import { Logo } from "./Brand";
import LanguageSwitcher from "./i18n/LanguageSwitcher";
import { getT } from "@/lib/i18n/server";
export default async function Footer() {
  const t = await getT();
  return (
    <footer className="border-t border-line bg-cream pb-24 pt-10 lg:pb-8">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-muted">
            {t("footer.zgjoiConnectsCustomersKosovo")}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <span>{t("common.language")}</span>
            <LanguageSwitcher />
          </div>
        </div>
        <nav aria-label={t("footer.services")} className="flex flex-col gap-3 text-sm">
          <Link href="/kerko">{t("footer.findPros")}</Link>
          <Link href="/kategorite">{t("footer.categories")}</Link>
          <Link href="/profesionistet">{t("footer.pros")}</Link>
          <Link href="/si-funksionon">{t("footer.howWorks")}</Link>
        </nav>
        <nav aria-label={t("footer.information")} className="flex flex-col gap-3 text-sm">
          <Link href="/rreth-nesh">{t("footer.aboutUs")}</Link>
          <Link href="/kushtet">{t("footer.termsUse")}</Link>
          <Link href="/privatesia">{t("footer.privacy")}</Link>
          <Link href="/hyr">{t("footer.myAccount")}</Link>
          <p className="text-muted">{t("footer.helpOpenSupportChat")}</p>
        </nav>
      </div>
    </footer>
  );
}
