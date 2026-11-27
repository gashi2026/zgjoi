import Link from "@/components/i18n/Link";
import { getT } from "@/lib/i18n/server";
/** Card around every sign-up step (same look as the login/auth pages). */
export default async function SignupShell({ title, text, children, links = true }: { title: string; text?: string; children: React.ReactNode; links?: boolean }) {
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {text && <p className="my-3 text-muted">{text}</p>}
        <div className="mt-5">{children}</div>
        {links && (
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-gold-dark">
            <Link href="/hyr">{t("authPage.log")}</Link>
            <Link href="/regjistrohu">{t("authPage.customerAccount")}</Link>
            <Link href="/regjistrohu-profesionist">{t("authPage.becomePro")}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
