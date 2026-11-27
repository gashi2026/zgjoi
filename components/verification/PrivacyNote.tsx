import Link from "@/components/i18n/Link";
import { ID_RETENTION_DAYS_AFTER_DECLINE } from "@/lib/id-verification";
import { getT } from "@/lib/i18n/server";
export default async function PrivacyNote() {
  const t = await getT();
  return (
    <aside aria-label={t("privacyNote.privacyNote")} className="rounded-2xl border border-line bg-[#FFFDF5] p-4 text-sm leading-relaxed">
      <p className="mb-1 font-bold">{t("privacyNote.privacyNote2")}</p>
      <p>
        {t("privacyNote.documentPhotosUsedOnly", { ID_RETENTION_DAYS_AFTER_DECLINE: ID_RETENTION_DAYS_AFTER_DECLINE })}</p>
      <p className="mt-2">
        {t("privacyNote.afterApprovalWeKeep")}{" "}<Link href="/privatesia" className="font-semibold text-gold-dark underline">{t("privacyNote.privacyPolicy")}</Link>
      </p>
    </aside>
  );
}
