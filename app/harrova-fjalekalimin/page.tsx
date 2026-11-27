import AuthPage from "@/components/marketplace/AuthPage";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  return (
    <AuthPage
      title={t("auth.resetPassword")}
      endpoint="/api/auth/forgot"
      label={t("auth.sendLink")}
      text={t("auth.enterAccountEmailIf")}
      fields={[
        { name: "email", label: t("auth.email"), type: "email", required: true },
      ]}
    />
  );
}
