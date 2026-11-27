import { msgKey, type T } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/messages/sq";
import Link from "@/components/i18n/Link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { adminIdQueue, canReviewIds, idUploadsAvailable, supportReviewers } from "@/lib/server/id-verification";
import { dateTime } from "@/lib/format";
import { asDocumentType, declineText, idDocumentTypeLabels, idStatusLabels, ID_RETENTION_DAYS_AFTER_DECLINE, type IdSide, type IdStatus } from "@/lib/id-verification";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { IdImages, IdDecision, ReviewPermissionToggle } from "@/components/verification/IdReviewer";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";

const roleLabel = (t: T, r: string) => (r === "PRO" ? t("admin.pro3") : t("admin.customer3"));
const waited = (t: T, d: Date) => {
  const h = Math.floor((Date.now() - d.getTime()) / 3_600_000);
  return h < 1 ? t("admin.lessThan1Hour") : h < 48 ? t("admin.hr2", { h }) : t("admin.days", { value: Math.floor(h / 24) });
};
const actionLabels: Record<string, MessageKey> = {
  ID_SUBMITTED: msgKey("admin.sentDocument"), ID_APPROVED: msgKey("admin.approved"), ID_DECLINED: msgKey("admin.declined"),
  ID_IMAGES_DELETED: msgKey("admin.photosDeleted3"), ID_IMAGE_VIEWED: msgKey("admin.firstView"), ID_RECORD_CREATED: msgKey("admin.recordCreated"),
};

/** Owner's ID queue: oldest pending first, front/back side by side, approve or decline with a reason. */
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const t = await getT();
  const actor = await pageGuard("ADMIN", "SUPPORT");
  if (!(await canReviewIds(actor)))
    return (
      <Frame actor={actor} title={t("admin.idVerification")}>
        <Panel><p className="font-semibold">{t("admin.dontHavePermissionView")}</p>
          <p className="text-sm text-muted">{t("admin.permissionGrantedRemovedAdministrator")}</p></Panel>
      </Frame>
    );
  const isAdmin = actor.role === "ADMIN";
  const staff = isAdmin ? await supportReviewers(actor) : [];
  const grants = isAdmin ? await db.auditLog.findMany({ where: { action: { in: ["ID_REVIEW_GRANTED", "ID_REVIEW_REVOKED"] } }, orderBy: { createdAt: "desc" }, take: 5,
    select: { id: true, action: true, target: true, createdAt: true, actor: { select: { name: true } } } }) : [];
  const staffName = (uid: string) => staff.find((u) => u.id === uid)?.name ?? uid;
  const { id } = await searchParams;
  const { pending, recent, missing } = await adminIdQueue(actor);
  const current = (id && [...pending, ...recent].find((v) => v.id === id)) || pending[0];
  const next = pending.find((v) => v.id !== current?.id);
  const history = current ? await db.auditLog.findMany({
    where: { target: current.id, action: { in: Object.keys(actionLabels).filter((a) => a !== "ID_IMAGE_VIEWED") } }, orderBy: { createdAt: "desc" }, take: 12,
    select: { id: true, action: true, createdAt: true, meta: true, actor: { select: { name: true } } },
  }) : [];
  return (
    <Frame actor={actor} title={t("admin.idVerification")}
      subtitle={t("admin.reviewEveryDocumentHand", { ID_RETENTION_DAYS_AFTER_DECLINE: ID_RETENTION_DAYS_AFTER_DECLINE })}>
      <Link href="/admin/verifikimi/regjistri" className="inline-flex min-h-11 items-center rounded-full border border-gold bg-white px-5 font-semibold hover:bg-honey">{t("admin.identityRecordsAuthorities")}</Link>
      {!idUploadsAvailable() && (
        <Panel><p className="text-sm"><span className="font-semibold">{t("admin.idUploadsSwitchedOff")}</span> {" "}{t("admin.environmentDocumentUploadsEnabled")}</p></Panel>
      )}
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel>
          <h2 className="font-bold">{t("admin.pending2", { count: pending.length })}</h2>
          <p className="mb-3 text-xs text-muted">{t("admin.oldestFirstAccountsStill", { missing: missing })}</p>
          {!pending.length && <p className="text-sm text-muted">{t("admin.noDocumentsWaiting")}</p>}
          <ol className="space-y-2" data-testid="id-queue">
            {pending.map((v) => (
              <li key={v.id}>
                <Link href={`/admin/verifikimi?id=${v.id}`} className={`block rounded-xl border p-3 text-sm ${v.id === current?.id ? "border-gold bg-honey" : "border-line hover:bg-honey/50"}`}>
                  <span className="block font-semibold">{v.user.name}</span>
                  <span className="block text-muted">{t("admin.waiting", { label: roleLabel(t, v.user.role), value: idDocumentTypeLabels[asDocumentType(v.documentType)], value2: waited(t, v.submittedAt) })}{v.attempts > 1 ? t("admin.attemptCount", { count: v.attempts }) : ""}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
        <div className="min-w-0 space-y-6">
          {current ? (
            <Panel>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold">{current.user.name}</h2>
                  <p className="break-all text-sm">{current.user.email}</p>
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-ink">{t.tx(idDocumentTypeLabels[asDocumentType(current.documentType)])}</span> · {roleLabel(t, current.user.role)}{current.user.city ? ` · ${current.user.city}` : ""} {" "}{t("admin.registeredSent", { date: dateTime(current.user.createdAt, t.locale), date2: dateTime(current.submittedAt, t.locale) })}{current.attempts > 1 ? t("admin.attemptCount", { count: current.attempts }) : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${current.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : current.status === "DECLINED" ? "bg-red-100 text-red-800" : "bg-honey"}`}>
                  {t.tx(idStatusLabels[current.status as IdStatus])}
                </span>
              </div>
              <p className="mb-3 text-sm">{t("admin.checkNameMatches")}{" "}<span className="font-semibold">{current.user.name}</span>{t("admin.document")}{" "}{asDocumentType(current.documentType) === "PASSPORT" ? t("admin.validPassportPhotoPage") : t("admin.validIdCardBoth")}.</p>
              <IdImages id={current.id} sides={current.images.map((i) => i.side as IdSide)} documentType={asDocumentType(current.documentType)} deleted={!!current.imagesDeletedAt} />
              <div className="mt-5">
                {current.status === "PENDING" ? (
                  <IdDecision id={current.id} nextHref={next ? `/admin/verifikimi?id=${next.id}` : "/admin/verifikimi"} accountName={current.user.name} documentType={asDocumentType(current.documentType)} />
                ) : (
                  <p className="text-sm">
                    {t("admin.on", { value: idStatusLabels[current.status as IdStatus] })}{" "}{current.decidedAt ? dateTime(current.decidedAt, t.locale) : "—"}
                    {current.status === "DECLINED" ? ` · ${t.tx(declineText(current.declineReason, current.declineNote))}` : ""}
                    {current.imagesDeletedAt ? t("admin.photosDeleted", { date: dateTime(current.imagesDeletedAt, t.locale) }) : current.purgeAfter ? t("admin.photosDeleted2", { date: dateTime(current.purgeAfter, t.locale) }) : ""}
                    {" · "}<Link className="font-semibold text-gold-dark underline" href={`/admin/verifikimi/regjistri/${current.user.id}`}>{t("admin.identityRecord")}</Link>
                  </p>
                )}
              </div>
              {history.length > 0 && (
                <details className="mt-5 text-sm">
                  <summary className="cursor-pointer font-semibold text-gold-dark">{t("admin.auditLog", { count: history.length })}</summary>
                  <ul className="mt-2 space-y-1">
                    {history.map((h) => (
                      <li key={h.id}>{dateTime(h.createdAt, t.locale)} · {actionLabels[h.action] ? t(actionLabels[h.action]) : h.action}{h.actor ? ` · ${h.actor.name}` : t("admin.systemSuffix")}</li>
                    ))}
                  </ul>
                </details>
              )}
            </Panel>
          ) : (
            <Panel><p>{t("admin.noDocumentsReview")}</p></Panel>
          )}
          <Panel>
            <h2 className="mb-3 font-bold">{t("admin.recentDecisions")}</h2>
            {!recent.length ? <p className="text-sm text-muted">{t("admin.noDecisionsYet")}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="text-muted"><th className="py-1 pr-3">{t("admin.user")}</th><th className="pr-3">{t("admin.role")}</th><th className="pr-3">{t("admin.document2")}</th><th className="pr-3">{t("admin.decision")}</th><th className="pr-3">{t("admin.date")}</th><th>{t("admin.photos")}</th></tr></thead>
                  <tbody>
                    {recent.map((v) => (
                      <tr key={v.id} className="border-t border-line">
                        <td className="py-2 pr-3"><Link className="text-gold-dark" href={`/admin/verifikimi?id=${v.id}`}>{v.user.name}</Link>{v.status === "APPROVED" && <> · <Link className="text-xs underline" href={`/admin/verifikimi/regjistri/${v.user.id}`}>{t("admin.record")}</Link></>}</td>
                        <td className="pr-3">{roleLabel(t, v.user.role)}</td>
                        <td className="pr-3">{t.tx(idDocumentTypeLabels[asDocumentType(v.documentType)])}</td>
                        <td className="pr-3">{t.tx(idStatusLabels[v.status as IdStatus])}{v.status === "DECLINED" ? ` — ${t.tx(declineText(v.declineReason, v.declineNote))}` : ""}</td>
                        <td className="pr-3">{v.decidedAt ? dateTime(v.decidedAt, t.locale) : "—"}</td>
                        <td>{v.imagesDeletedAt ? t("admin.deleted") : v.purgeAfter ? `deri ${dateTime(v.purgeAfter, t.locale)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          {isAdmin && (
            <Panel>
              <h2 className="font-bold">{t("admin.supportStaffPermission")}</h2>
              <p className="mb-3 text-sm text-muted">{t("admin.defaultSupportStaffCant")}</p>
              {!staff.length ? <p className="text-sm text-muted">{t("admin.noSupportStaffAccounts")}</p> : (
                <ul className="divide-y divide-line" data-testid="support-permissions">
                  {staff.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <span className="min-w-0"><span className="block font-semibold">{u.name}</span><span className="block break-all text-sm text-muted">{u.email}{u.suspendedAt ? " · pezulluar" : ""}</span></span>
                      <ReviewPermissionToggle userId={u.id} name={u.name} granted={u.canReviewIds} />
                    </li>
                  ))}
                </ul>
              )}
              {grants.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
                  {grants.map((g) => (
                    <li key={g.id}>{dateTime(g.createdAt, t.locale)} · {g.actor?.name ?? "—"} {g.action === "ID_REVIEW_GRANTED" ? t("admin.grantedPermission") : "ia hoqi lejen"} {staffName(g.target)}</li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </Frame>
  );
}
