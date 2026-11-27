import { idUploadsAvailable } from "@/lib/server/id-verification";
import AuthPage from "@/components/marketplace/AuthPage";
import { termsAcceptField } from "@/components/marketplace/termsAcceptField";
import { activeCategories } from "@/lib/server/catalog";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const t = await getT();
  const categories = await activeCategories();
  return (
    <AuthPage
      title={t("auth.becomeProZgjoi")}
      endpoint="/api/auth/register"
      label={t("auth.submitSignUp")}
      values={{ role: "PRO" }}
      text={t("auth.profileReviewedBeforeAppears", { value: idUploadsAvailable() ? t("auth.afterSigningUpUpload") : "" })}
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
          name: "categorySlug",
          label: t("auth.mainService"),
          type: "select",
          required: true,
          options: categories.map((c) => ({ value: c.slug, label: t.tx(c.name) })),
        },
        {
          name: "about",
          label: t("auth.experienceServices"),
          type: "textarea",
          minLength: 30,
          maxLength: 4000,
          required: true,
        },
        {
          name: "priceFrom",
          label: t("auth.startingPriceEuros"),
          type: "number",
          min: 0.01,
          max: 100000,
          step: "0.01",
          required: true,
        },
        termsAcceptField(t),
      ]}
    />
  );
}
