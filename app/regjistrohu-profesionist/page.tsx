import { idUploadsAvailable } from "@/lib/server/id-verification";
import SignupShell from "@/components/signup/SignupShell";
import SignupWizard from "@/components/signup/SignupWizard";
import { activeCategories } from "@/lib/server/catalog";
import { MAX_PRO_CATEGORIES } from "@/lib/pro-categories";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
/** Pro sign-up: step 1 account → step 2 professions (one or more, no prices) → step 3 ID. */
export default async function Page() {
  const t = await getT();
  const idStep = idUploadsAvailable();
  const categories = await activeCategories();
  return (
    <SignupShell title={t("auth.becomeProZgjoi")} text={idStep ? t("signupWizard.proIntroWithId") : t("signupWizard.proIntro")}>
      <SignupWizard role="PRO" idStep={idStep} maxCategories={MAX_PRO_CATEGORIES}
        categories={categories.map((c) => ({ slug: c.slug, label: t.tx(c.name), icon: c.icon }))} />
    </SignupShell>
  );
}
