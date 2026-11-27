import Link from "@/components/i18n/Link";
import { pageGuard } from "@/lib/server/guard";
import { canReviewIds, listIdentityRecords } from "@/lib/server/id-verification";
import { dateTime } from "@/lib/format";
import { asDocumentType, idDocumentTypeLabels } from "@/lib/id-verification";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { inputClass, buttonClass } from "@/components/marketplace/ApiForm";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Permanent identity records (kept after the photos are deleted). List shows no decrypted data. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getT();
  const actor = await pageGuard("ADMIN", "SUPPORT");
  if (!(await canReviewIds(actor)))
    return (
      <Frame actor={actor} title={t("admin.identityRecords")}>
        <Panel><p className="font-semibold">{t("admin.dontHavePermissionView")}</p>
          <p className="text-sm text-muted">{t("admin.permissionGrantedRemovedAdministrator")}</p></Panel>
      </Frame>
    );
  const { q = "" } = await searchParams;
  const rows = await listIdentityRecords(actor, q);
  return (
    <Frame actor={actor} title={t("admin.identityRecords")} subtitle={t("admin.verifiedDetailsKeptPermanently")}>
      <Link href="/admin/verifikimi" className="text-sm font-semibold text-gold-dark underline">{t("admin.verificationQueue")}</Link>
      <Panel>
        <form className="flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder={t("admin.nameEmailLast4")} aria-label={t("admin.searchRecords")} className={`${inputClass} min-w-0 flex-1`} />
          <button className={buttonClass}>{t("admin.search")}</button>
        </form>
        <p className="mt-2 text-xs text-muted">{t("admin.openingExportingRecordRecorded")}</p>
      </Panel>
      <Panel>
        {rows.length === 0 ? <p className="text-muted">{t("admin.noRecords")}{q ? t("admin.search2") : " ende"}.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-muted"><th className="py-2 pr-3">{t("admin.legalName")}</th><th className="pr-3">{t("admin.account")}</th><th className="pr-3">{t("admin.document2")}</th><th className="pr-3">{t("admin.no")}</th><th className="pr-3">{t("admin.country")}</th><th>{t("admin.verified3")}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId} className="border-t border-line">
                    <td className="py-2 pr-3"><Link className="font-semibold text-gold-dark" href={`/admin/verifikimi/regjistri/${r.userId}`}>{r.legalName}</Link></td>
                    <td className="pr-3">{r.user.email}<span className="block text-xs text-muted">{r.user.role === "PRO" ? t("admin.pro3") : t("admin.customer3")}</span></td>
                    <td className="pr-3">{t.tx(idDocumentTypeLabels[asDocumentType(r.documentType)])}</td>
                    <td className="pr-3 font-mono">•••• {r.documentNoLast4}</td>
                    <td className="pr-3">{r.issuingCountry}</td>
                    <td>{dateTime(r.verifiedAt, t.locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Frame>
  );
}
