import Link from "@/components/i18n/Link";
import type { Field } from "./ApiForm";
import type { T } from "@/lib/i18n/translate";

/** Required sign-up checkbox, with links to the terms and the privacy policy. */
export function termsAcceptField(t: T): Field {
  return {
    name: "terms",
    label: (
      <>
        {t("auth.acceptTermsPrefix")}{" "}
        <Link href="/kushtet" className="font-semibold text-gold-dark underline underline-offset-2">
          {t("auth.acceptTermsLink")}
        </Link>{" "}
        {t("auth.acceptTermsJoiner")}{" "}
        <Link href="/privatesia" className="font-semibold text-gold-dark underline underline-offset-2">
          {t("auth.acceptPrivacyLink")}
        </Link>
      </>
    ),
    type: "checkbox",
    required: true,
  };
}
