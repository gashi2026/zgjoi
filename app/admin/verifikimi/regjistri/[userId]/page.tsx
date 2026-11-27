import { msgKey, type T } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/messages/sq";
import Link from "@/components/i18n/Link";
import { pageGuard } from "@/lib/server/guard";
import { canReviewIds, identityRecordFor } from "@/lib/server/id-verification";
import { dateTime } from "@/lib/format";
import { declineText, idDocumentTypeLabels, idStatusLabels, asDocumentType, type IdStatus } from "@/lib/id-verification";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { PrintButton } from "@/components/verification/PrintButton";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const actionLabels: Record<string, MessageKey> = {
  ID_SUBMITTED: msgKey("admin.documentSent"), ID_APPROVED: msgKey("admin.approved2"), ID_DECLINED: msgKey("admin.declined2"),
  ID_IMAGES_DELETED: msgKey("admin.photosDeleted3"), ID_RECORD_CREATED: msgKey("admin.recordSaved"),
};
const roleLabel = (t: T, r: string) => (r === "PRO" ? t("admin.pro3") : r === "CLIENT" ? t("admin.customer3") : r === "ADMIN" ? t("admin.administrator") : t("admin.support2"));

function historyText(action: string, meta: unknown) {
  const m = (meta ?? {}) as Record<string, unknown>;
  const bits: string[] = [];
  if (typeof m.documentType === "string") bits.push(idDocumentTypeLabels[asDocumentType(m.documentType)]);
  if (typeof m.attempt === "number") bits.push(`prova ${m.attempt}`);
  if (action === "ID_DECLINED" && typeof m.reason === "string") bits.push(declineText(m.reason, typeof m.note === "string" ? m.note : null));
  else if (typeof m.note === "string" && m.note) bits.push(m.note);
  return bits.join(" · ");
}

/** One person's identity record: on screen, and as a printable export (?eksport=1) for authorities. Both are audited. */
export default async function Page({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ eksport?: string }> }) {
  const t = await getT();
  const actor = await pageGuard("ADMIN", "SUPPORT");
  if (!(await canReviewIds(actor)))
    return (
      <Frame actor={actor} title={t("admin.identityRecord2")}>
        <Panel><p className="font-semibold">{t("admin.dontHavePermissionView")}</p>
          <p className="text-sm text-muted">{t("admin.permissionGrantedRemovedAdministrator")}</p></Panel>
      </Frame>
    );
  const [{ userId }, { eksport }] = await Promise.all([params, searchParams]);
  const exporting = eksport === "1";
  const data = await identityRecordFor(actor, userId, exporting ? "EXPORT" : "VIEW");
  const { user, record: r, verification: v, history } = data;
  const now = new Date();

  const sheet = (
    <article data-testid="identity-record" data-print-sheet className="space-y-5 rounded-2xl border border-line bg-white p-5 text-ink sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{t("admin.zgjoiIdentityRecord")}</p>
          <h1 className="text-2xl font-bold">{r?.legalName ?? user.name}</h1>
          <p className="text-sm text-muted">{t("admin.confidentialPrepared", { date: dateTime(now, t.locale), name: actor.name, label: roleLabel(t, actor.role) })}</p>
        </div>
        {exporting ? <PrintButton auto /> : (
          <Link href={`/admin/verifikimi/regjistri/${user.id}?eksport=1`} className="print:hidden inline-flex min-h-11 items-center rounded-full bg-gold px-5 font-semibold text-ink hover:bg-gold-dark">{t("admin.exportRecord")}</Link>
        )}
      </header>

      <section>
        <h2 className="mb-2 font-semibold">{t("admin.detailsFromDocument")}</h2>
        {r ? (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {([
              [t("admin.fullLegalName"), r.legalName],
              [t("admin.dateBirth"), r.birthDate],
              [t("admin.documentType"), t.tx(idDocumentTypeLabels[r.documentType])],
              [t("admin.documentNumber"), r.documentNumber],
              [t("admin.issuingCountry"), r.issuingCountry],
              [t("admin.validUntil"), r.expiresOn],
              [t("admin.verified"), dateTime(r.verifiedAt, t.locale)],
              [t("admin.verified2"), r.verifiedBy ? `${r.verifiedBy.name} (${roleLabel(t, r.verifiedBy.role)})` : "—"],
            ] as const).map(([k, val]) => (
              <div key={k} className="border-b border-line/60 py-1"><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold">{val}</dd></div>
            ))}
          </dl>
        ) : <p className="text-muted">{t("admin.userHasntBeenApproved")}</p>}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{t("admin.zgjoiAccount")}</h2>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {([
            [t("admin.accountName"), user.name], ["Email", user.email], [t("admin.phone"), user.phone ?? "—"],
            [t("admin.role"), roleLabel(t, user.role)], [t("admin.city"), user.city ?? "—"], [t("admin.registered"), dateTime(user.createdAt, t.locale)],
            [t("admin.accountId"), user.id],
            [t("admin.verificationStatus"), v ? t.tx(idStatusLabels[v.status as IdStatus]) : "—"],
          ] as const).map(([k, val]) => (
            <div key={k} className="border-b border-line/60 py-1"><dt className="text-xs text-muted">{k}</dt><dd className="break-all font-semibold">{val}</dd></div>
          ))}
        </dl>
        {v && <p className="mt-2 text-xs text-muted">{t("admin.totalAttempts", { attempts: v.attempts })}{" "}{v.imagesDeletedAt ? t("admin.documentPhotosWereDeleted", { date: dateTime(v.imagesDeletedAt, t.locale) }) : v.purgeAfter ? t("admin.documentPhotosWillDeleted", { date: dateTime(v.purgeAfter, t.locale) }) : ""}</p>}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{t("admin.decisionAttemptHistory")}</h2>
        {history.length === 0 ? <p className="text-muted">{t("admin.noEvents")}</p> : (
          <table className="w-full text-left text-sm">
            <thead><tr className="text-muted"><th className="py-1 pr-3">{t("admin.date")}</th><th className="pr-3">{t("admin.event")}</th><th className="pr-3">{t("admin.by")}</th><th>{t("admin.details")}</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-line align-top">
                  <td className="py-1 pr-3 whitespace-nowrap">{dateTime(h.createdAt, t.locale)}</td>
                  <td className="pr-3">{actionLabels[h.action] ? t(actionLabels[h.action]) : h.action}</td>
                  <td className="pr-3">{h.actor ? `${h.actor.name} (${roleLabel(t, h.actor.role)})` : t("admin.system")}</td>
                  <td>{historyText(h.action, h.meta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <footer className="border-t border-line pt-3 text-xs text-muted">
        {t("admin.documentContainsPersonalData")}</footer>
    </article>
  );

  if (exporting) return <main className="mx-auto max-w-3xl bg-white p-4 sm:p-8 print:max-w-none print:p-0">{sheet}</main>;
  return (
    <Frame actor={actor} title={t("admin.identityRecord2")} hideIdNotice>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/verifikimi/regjistri" className="font-semibold text-gold-dark underline">{t("admin.allRecords")}</Link>
        {v && <Link href={`/admin/verifikimi?id=${v.id}`} className="font-semibold text-gold-dark underline">{t("admin.nextDocumentQueue")}</Link>}
      </div>
      {sheet}
    </Frame>
  );
}
