"use client";
import { useState, type FormEvent } from "react";
import Link from "@/components/i18n/Link";
import { useRouter, useT } from "@/lib/i18n/client";
import { buttonClass, inputClass } from "@/components/marketplace/ApiForm";
import CategoryIcon from "@/components/CategoryIcon";
import SignupSteps from "./SignupSteps";

export type WizardCategory = { slug: string; label: string; icon: string };

type Account = { name: string; email: string; password: string; city: string; terms: boolean };
const ACCOUNT_FIELDS = ["name", "email", "password", "city", "terms"];

/** Sign-up wizard. Customer: Account → ID. Pro: Account → Professions → ID.
 * The account is created when the last step before the ID is sent; the ID step itself is
 * /regjistrohu/identiteti, which the user cannot skip (every account page sends them back). */
export default function SignupWizard({ role, categories = [], idStep, maxCategories }: {
  role: "CLIENT" | "PRO"; categories?: WizardCategory[]; idStep: boolean; maxCategories: number;
}) {
  const t = useT();
  const router = useRouter();
  const pro = role === "PRO";
  const steps = [t("signupWizard.stepAccount"), ...(pro ? [t("signupWizard.stepProfessions")] : []), ...(idStep ? [t("signupWizard.stepId")] : [])];
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState<Account>({ name: "", email: "", password: "", city: "", terms: false });
  const [picked, setPicked] = useState<string[]>([]);
  const [about, setAbout] = useState("");
  const [experience, setExperience] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const set = (key: keyof Account) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAccount((a) => ({ ...a, [key]: key === "terms" ? e.target.checked : e.target.value }));

  function toggle(slug: string) {
    setMessage("");
    setPicked((list) => list.includes(slug) ? list.filter((s) => s !== slug)
      : list.length >= maxCategories ? (setMessage(t("signupWizard.upToProfessions", { count: maxCategories })), list) : [...list, slug]);
  }

  async function create() {
    setPending(true);
    setMessage("");
    setErrors({});
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, ...account, ...(pro ? { categories: picked, about, ...(experience.trim() ? { experience } : {}) } : {}) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        const fieldErrors: Record<string, string[]> = result.errors ?? {};
        setErrors(fieldErrors);
        // A problem with the account details (e.g. the email is taken) sends the pro back to step 1.
        if (pro && (Object.keys(fieldErrors).some((k) => ACCOUNT_FIELDS.includes(k)) || result.code === "ACCOUNT_EXISTS")) setStep(0);
        throw new Error(result.message || result.error || t("signupWizard.didntWorkTryAgain"));
      }
      router.push(typeof result.redirect === "string" && result.redirect.startsWith("/") ? result.redirect : "/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? t.any(error.message) : t("signupWizard.connectionFailed"));
      setPending(false);
    }
  }

  function next(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    if (pro && step === 0) { setMessage(""); setStep(1); window.scrollTo({ top: 0 }); return; }
    if (pro && !picked.length) return setMessage(t("signupWizard.chooseLeastOneProfession"));
    void create();
  }

  const err = (name: string) => errors[name]?.length ? (
    <span id={`signup-${name}-errors`} className="mt-1 block text-sm font-normal text-red-700">{errors[name].map((m) => t.any(m)).join(" ")}</span>
  ) : null;
  const field = (name: keyof Account, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block text-sm font-semibold text-ink">
      <span>{label} *</span>
      <input name={name} value={String(account[name])} onChange={set(name)} required className={`${inputClass} mt-1`}
        aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `signup-${name}-errors` : undefined} {...props} />
      {props.title && <span className="mt-1 block text-xs font-normal text-muted">{props.title}</span>}
      {err(name)}
    </label>
  );
  const last = step === steps.length - 1 - (idStep ? 1 : 0);

  return (
    <div>
      <SignupSteps steps={steps} current={step} label={t("signupWizard.signUpSteps")} />
      <form onSubmit={next} className="space-y-4" aria-busy={pending} data-testid={`signup-step-${step + 1}`}>
        {step === 0 ? (
          <>
            {field("name", t("signupWizard.fullName"), { maxLength: 120, autoComplete: "name" })}
            {field("email", t("signupWizard.email"), { type: "email", autoComplete: "email" })}
            {field("password", t("signupWizard.password"), { type: "password", minLength: 12, autoComplete: "new-password", title: t("signupWizard.passwordHint") })}
            {field("city", t("signupWizard.city"), { maxLength: 60, autoComplete: "address-level2" })}
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="terms" checked={account.terms} onChange={set("terms")} required className="mt-1 h-5 w-5 accent-[#E0A800]" />
              <span>{t("signupWizard.iAccept")}{" "}
                <Link href="/kushtet" className="font-semibold text-gold-dark underline" target="_blank">{t("signupWizard.terms")}</Link>{" "}
                {t("signupWizard.and")}{" "}
                <Link href="/privatesia" className="font-semibold text-gold-dark underline" target="_blank">{t("signupWizard.privacy")}</Link> *
              </span>
            </label>
            {err("terms")}
          </>
        ) : (
          <>
            <fieldset>
              <legend className="font-semibold">{t("signupWizard.whatDoYouDo")} *</legend>
              <p className="mb-3 text-sm text-muted">{t("signupWizard.pickOneOrMore", { count: maxCategories })}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-testid="profession-picker">
                {categories.map((c) => {
                  const on = picked.includes(c.slug);
                  return (
                    <label key={c.slug} className="group cursor-pointer">
                      <input type="checkbox" className="peer sr-only" name="categories" value={c.slug} checked={on} onChange={() => toggle(c.slug)} />
                      <span className={`hexframe mx-auto block p-[2px] transition peer-focus-visible:ring-2 ${on ? "bg-gold" : "bg-line group-hover:bg-gold/60"}`} style={{ width: "100%", maxWidth: 104, aspectRatio: "0.866" }}>
                        <span className={`hexframe flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center ${on ? "bg-honey" : "bg-white"}`}>
                          <CategoryIcon name={c.icon} size={22} className={on ? "text-ink" : "text-gold-dark"} />
                          <span className="text-[11px] font-semibold leading-tight sm:text-xs">{c.label}</span>
                          {on && <span aria-hidden className="text-xs font-bold">✓</span>}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-sm" role="status">{t("signupWizard.selectedCount", { count: picked.length, max: maxCategories })}</p>
              {err("categories")}
            </fieldset>
            <label className="block text-sm font-semibold text-ink">
              <span>{t("signupWizard.aboutYourWork")} *</span>
              <textarea name="about" value={about} onChange={(e) => setAbout(e.target.value)} required minLength={30} maxLength={4000} rows={4}
                className={`${inputClass} mt-1`} aria-invalid={Boolean(errors.about)} />
              <span className="mt-1 block text-xs font-normal text-muted">{t("signupWizard.aboutHint")}</span>
              {err("about")}
            </label>
            <label className="block text-sm font-semibold text-ink">
              <span>{t("signupWizard.experience")}</span>
              <input name="experience" value={experience} onChange={(e) => setExperience(e.target.value)} maxLength={80} className={`${inputClass} mt-1`} placeholder={t("signupWizard.experiencePlaceholder")} />
            </label>
            <p className="rounded-xl bg-[#FFF9E3] p-3 text-sm" data-testid="no-prices-note">{t("signupWizard.pricesLater")}</p>
          </>
        )}
        {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 && (
            <button type="button" disabled={pending} onClick={() => { setMessage(""); setStep(step - 1); }} className="min-h-11 rounded-full border border-gold px-5 font-semibold">
              {t("signupWizard.back")}</button>
          )}
          <button disabled={pending} className={buttonClass}>
            {pending ? t("signupWizard.creating") : !last ? t("signupWizard.continue") : idStep ? t("signupWizard.createContinueId") : t("signupWizard.createAccount")}
          </button>
        </div>
        {last && idStep && <p className="text-xs text-muted">{t("signupWizard.idNextNote")}</p>}
      </form>
    </div>
  );
}
