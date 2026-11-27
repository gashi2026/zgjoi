import { idUploadsAvailable } from "@/lib/server/id-verification";
import AuthPage from "@/components/marketplace/AuthPage";
import { getT } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getT();
  return (
    <AuthPage
      title={t("auth.createAccount")}
      endpoint="/api/auth/register"
      label={t("auth.signUp")}
      values={{ role: "CLIENT" }}
      fields={[
        {
          name: "name",
          label: t("auth.fullName"),
          required: true,
          maxLength: 120,
          autoComplete: "name",
        },
        {
          name: "email",
          label: t("auth.email"),
          type: "email",
          required: true,
          autoComplete: "email",
        },
        {
          name: "password",
          label: t("auth.password"),
          type: "password",
          required: true,
          minLength: 12,
          hint: t("auth.least12CharactersUp"),
          autoComplete: "new-password",
        },
        {
          name: "city",
          label: t("auth.city"),
          required: true,
          maxLength: 60,
          autoComplete: "address-level2",
        },
        {
          name: "terms",
          label: t("auth.iAcceptTermsPrivacy"),
          type: "checkbox",
          required: true,
        },
      ]}
      text={t("auth.chooseProStartPrivate", { value: idUploadsAvailable() ? t("auth.afterSignUpWell") : "" })}
    />
  );
}
