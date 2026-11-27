import { localRedirect } from "@/lib/i18n/redirect";
import Link from "@/components/i18n/Link";
import { signupGuard } from "@/lib/server/guard";
import { accountHome } from "@/lib/server/auth";
import { idStatusFor, idUploadsAvailable } from "@/lib/server/id-verification";
import { needsIdCheck } from "@/lib/id-verification";
import SignupShell from "@/components/signup/SignupShell";
import SignupSteps from "@/components/signup/SignupSteps";
import IdUploadForm from "@/components/verification/IdUploadForm";
import PrivacyNote from "@/components/verification/PrivacyNote";
import HexBadge from "@/components/verification/HexBadge";
import { getT, pageMetadata } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export const generateMetadata = () => pageMetadata({ title: "meta.idVerificationTitle", robots: { index: false, follow: false } });

/** Last step of the sign-up wizard (customers and pros): upload the ID. Required: until it is
 * sent, every account page redirects here. Returning users (log in mid-wizard) land here too. */
export default async function Page() {
  const t = await getT();
  const actor = await signupGuard();
  if (!needsIdCheck(actor.role) || !idUploadsAvailable()) return localRedirect(accountHome(actor.role));
  const row = await idStatusFor(actor.id);
  const pro = actor.role === "PRO";
  const steps = [t("signupWizard.stepAccount"), ...(pro ? [t("signupWizard.stepProfessions")] : []), t("signupWizard.stepId")];
  // Already sent (or an existing account that never went through the wizard): the regular page.
  if (actor.signupStep !== "ID" && !row) return localRedirect("/verifikimi");
  if (actor.signupStep !== "ID") {
    return (
      <SignupShell title={t("signupWizard.signUpComplete")} links={false}>
        <SignupSteps steps={steps} current={steps.length} label={t("signupWizard.signUpSteps")} />
        <div className="flex items-start gap-4" data-testid="signup-complete">
          <HexBadge>⏳</HexBadge>
          <div>
            <p className="text-lg font-bold">{t("signupWizard.thanksIdUnderReview")}</p>
            <p className="mt-1 text-sm text-muted">{pro ? t("signupWizard.proWhatNext") : t("signupWizard.customerWhatNext")}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {pro && <Link href="/pro/profili#profesionet" className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 font-semibold">{t("signupWizard.setPricesNow")}</Link>}
          <Link href={accountHome(actor.role)} className={`inline-flex min-h-11 items-center rounded-full px-5 font-semibold ${pro ? "border border-gold" : "bg-gold"}`}>
            {t("signupWizard.goToDashboard")}</Link>
        </div>
      </SignupShell>
    );
  }
  return (
    <SignupShell title={t("signupWizard.verifyIdentity")} text={pro ? t("signupWizard.idWhyPro") : t("signupWizard.idWhyCustomer")} links={false}>
      <SignupSteps steps={steps} current={steps.length - 1} label={t("signupWizard.signUpSteps")} />
      <p className="mb-4 rounded-xl bg-[#FFF9E3] p-3 text-sm" data-testid="id-step-required">
        {t("signupWizard.accountCreatedIdRequired", { name: actor.name })}</p>
      <IdUploadForm afterHref="/regjistrohu/identiteti" />
      <div className="mt-6"><PrivacyNote /></div>
    </SignupShell>
  );
}
