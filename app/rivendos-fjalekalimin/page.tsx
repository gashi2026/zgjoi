import AuthPage from "@/components/marketplace/AuthPage";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  return (
    <AuthPage
      title={t("auth.newPassword")}
      endpoint="/api/auth/reset"
      label={t("auth.savePassword")}
      fragmentToken
      fields={[
        {
          name: "password",
          label: t("auth.newPassword"),
          type: "password",
          required: true,
          minLength: 12,
          autoComplete: "new-password",
        },
      ]}
    />
  );
}
