import AuthPage from "@/components/marketplace/AuthPage";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  return (
    <AuthPage
      title={t("auth.welcomeBack")}
      endpoint="/api/auth/login"
      label={t("auth.log")}
      fields={[
        {
          name: "email",
          label: t("auth.email"),
          type: "email",
          required: true,
          autoComplete: "username",
        },
        {
          name: "password",
          label: t("auth.password"),
          type: "password",
          required: true,
          autoComplete: "current-password",
        },
        {
          name: "secondFactor",
          label: t("auth.authenticationRecoveryCodeIf"),
          autoComplete: "one-time-code",
        },
      ]}
    />
  );
}
