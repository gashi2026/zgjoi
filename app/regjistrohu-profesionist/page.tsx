import AuthPage from "@/components/marketplace/AuthPage";
import { activeCategories } from "@/lib/server/catalog";
export const dynamic = "force-dynamic";
export default async function Page() {
  const categories = await activeCategories();
  return (
    <AuthPage
      title="Bëhuni profesionist në Zgjoi"
      endpoint="/api/auth/register"
      label="Dërgo regjistrimin"
      values={{ role: "PRO" }}
      text="Profili juaj shqyrtohet para se të shfaqet në kërkim. Klientët ju kontaktojnë drejtpërdrejt; ju dërgoni ofertën tuaj."
      fields={[
        {
          name: "name",
          label: "Emri dhe mbiemri",
          required: true,
          maxLength: 120,
          autoComplete: "name",
        },
        {
          name: "email",
          label: "Emaili",
          type: "email",
          required: true,
          autoComplete: "email",
        },
        {
          name: "password",
          label: "Fjalëkalimi",
          type: "password",
          required: true,
          minLength: 12,
          hint: "Të paktën 12 karaktere; deri në 72 byte.",
          autoComplete: "new-password",
        },
        {
          name: "city",
          label: "Qyteti",
          required: true,
          maxLength: 60,
          autoComplete: "address-level2",
        },
        {
          name: "categorySlug",
          label: "Shërbimi kryesor",
          type: "select",
          required: true,
          options: categories.map((c) => ({ value: c.slug, label: c.name })),
        },
        {
          name: "about",
          label: "Përvoja dhe shërbimet tuaja",
          type: "textarea",
          minLength: 30,
          maxLength: 4000,
          required: true,
        },
        {
          name: "priceFrom",
          label: "Çmimi fillestar në euro",
          type: "number",
          min: 0.01,
          max: 100000,
          step: "0.01",
          required: true,
        },
        {
          name: "terms",
          label: "Pranoj kushtet dhe politikën e privatësisë",
          type: "checkbox",
          required: true,
        },
      ]}
    />
  );
}
