import AuthPage from "@/components/marketplace/AuthPage";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  return (
    <AuthPage
      title={t("auth.verifyEmail")}
      endpoint="/api/auth/verify"
      label={t("auth.confirmEmail")}
      fragmentToken
      text={t("auth.pressButtonConfirmEmail")}
    />
  );
}
