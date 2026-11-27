import Link from "@/components/i18n/Link";
import ApiForm, { type Field } from "./ApiForm";
import { getT } from "@/lib/i18n/server";
export default async function AuthPage({
  title,
  text,
  endpoint,
  fields,
  values,
  label,
  fragmentToken,
}: {
  title: string;
  text?: string;
  endpoint: string;
  fields?: Field[];
  values?: Record<string, unknown>;
  label: string;
  fragmentToken?: boolean;
}) {
  const t = await getT();
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-bold">{title}</h1>
        {text && <p className="my-4 text-muted">{text}</p>}
        <div className="mt-6">
          <ApiForm
            endpoint={endpoint}
            fields={fields}
            values={values}
            label={label}
            fragmentToken={fragmentToken}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gold-dark">
          <Link href="/hyr">{t("authPage.log")}</Link>
          <Link href="/regjistrohu">{t("authPage.customerAccount")}</Link>
          <Link href="/regjistrohu-profesionist">{t("authPage.becomePro")}</Link>
          <Link href="/harrova-fjalekalimin">{t("authPage.forgotPassword")}</Link>
        </div>
      </div>
    </div>
  );
}
