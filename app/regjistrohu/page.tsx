import { idUploadsAvailable } from "@/lib/server/id-verification";
import SignupShell from "@/components/signup/SignupShell";
import SignupWizard from "@/components/signup/SignupWizard";
import { MAX_PRO_CATEGORIES } from "@/lib/pro-categories";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
/** Customer sign-up: step 1 account → step 2 ID (required; /regjistrohu/identiteti). */
export default async function Page() {
  const t = await getT();
  const idStep = idUploadsAvailable();
  return (
    <SignupShell title={t("auth.createAccount")} text={idStep ? t("signupWizard.customerIntroWithId") : t("signupWizard.customerIntro")}>
      <SignupWizard role="CLIENT" idStep={idStep} maxCategories={MAX_PRO_CATEGORIES} />
    </SignupShell>
  );
}
