import { localRedirect } from "@/lib/i18n/redirect";
import Link from "@/components/i18n/Link";
import { pageGuard } from "@/lib/server/guard";
import { accountHome } from "@/lib/server/auth";
import { CLIENT_BROWSE_ONLY, idStatusFor, idUploadsAvailable } from "@/lib/server/id-verification";
import { dateTime } from "@/lib/format";
import { asDocumentType, declineText, idDocumentTypeLabels, needsIdCheck } from "@/lib/id-verification";
import Frame, { Panel } from "@/components/marketplace/Frame";
import IdUploadForm from "@/components/verification/IdUploadForm";
import PrivacyNote from "@/components/verification/PrivacyNote";
import HexBadge from "@/components/verification/HexBadge";
import { getT } from "@/lib/i18n/server";

/** Customers and pros upload the front and back of their ID; Zgjoi approves or declines by hand. */
export default async function Page({ searchParams }: { searchParams: Promise<{ fillim?: string }> }) {
  const t = await getT();
  const actor = await pageGuard();
  if (!needsIdCheck(actor.role)) return localRedirect(accountHome(actor.role));
  const { fillim } = await searchParams;
  const row = await idStatusFor(actor.id);
  const available = idUploadsAvailable();
  const pro = actor.role === "PRO";
  const unlocks = pro ? t("idVerification.appearSearchAcceptJobs") : t("idVerification.bookHireRequestEstimates");
  return (
    <Frame actor={actor} hideIdNotice title={t("idVerification.identityVerification")}
      subtitle={t("idVerification.everyCustomerProZgjoi", { unlocks: unlocks, value: !pro && row?.status !== "APPROVED" ? ` ${CLIENT_BROWSE_ONLY}` : "" })}>
      {fillim && !row && (
        <Panel>
          <p className="font-bold">{t("idVerification.accountReadyOneLast")}</p>
          <p className="text-sm text-muted">{t("idVerification.takesAboutMinuteUntil")}</p>
          <Link href={accountHome(actor.role)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-gold-dark">{t("idVerification.laterGoMyDashboard")}</Link>
        </Panel>
      )}
      {!available ? (
        <Panel>
          <p className="font-semibold">{t("idVerification.documentUploadIsntAvailable")}</p>
          <p className="text-sm text-muted">{t("idVerification.wellLetKnowWhen")}</p>
        </Panel>
      ) : row?.status === "APPROVED" ? (
        <Panel>
          <div className="flex items-center gap-4" data-testid="id-status-approved">
            <HexBadge tone="green">✓</HexBadge>
            <div>
              <p className="text-lg font-bold">{t("idVerification.identityVerified")}</p>
              <p className="text-sm text-muted">{t("idVerification.approved")}{" "}{row.decidedAt ? dateTime(row.decidedAt, t.locale) : "—"}. {row.imagesDeletedAt ? t("idVerification.documentPhotosHaveBeen") : t("idVerification.photosDeletedAutomaticallyAfter")}</p>
            </div>
          </div>
        </Panel>
      ) : row?.status === "PENDING" ? (
        <Panel>
          <div className="flex items-center gap-4" data-testid="id-status-pending">
            <HexBadge>⏳</HexBadge>
            <div>
              <p className="text-lg font-bold">{t("idVerification.documentBeingReviewed")}</p>
              <p className="text-sm text-muted">{t("idVerification.sentWeUsuallyReview", { value: idDocumentTypeLabels[asDocumentType(row.documentType)], date: dateTime(row.submittedAt, t.locale) })}{actor.emailVerified ? t("idVerification.email") : ""}.</p>
            </div>
          </div>
          <details className="mt-4 rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gold-dark">{t("idVerification.wrongPhotoReplacePhotos")}</summary>
            <div className="mt-3"><IdUploadForm resubmit /></div>
          </details>
        </Panel>
      ) : (
        <Panel>
          {row?.status === "DECLINED" ? (
            <div className="mb-4 flex items-start gap-4 rounded-xl bg-red-50 p-3" data-testid="id-status-declined" role="alert">
              <HexBadge tone="red" size={44}>!</HexBadge>
              <div>
                <p className="font-bold">{t("idVerification.verificationWasDeclined")}</p>
                <p className="text-sm"><span className="font-semibold">{t("idVerification.reason")}</span> {t.tx(declineText(row.declineReason, row.declineNote))}</p>
                <p className="text-sm text-muted">{t("idVerification.uploadNewPhotosBelow")}</p>
              </div>
            </div>
          ) : (
            <h2 className="mb-1 text-lg font-bold">{t("idVerification.photographDocument")}</h2>
          )}
          <p className="mb-4 text-sm text-muted">{t("idVerification.weOnlyAcceptId")}</p>
          <IdUploadForm resubmit={row?.status === "DECLINED"} />
        </Panel>
      )}
      <PrivacyNote />
    </Frame>
  );
}
