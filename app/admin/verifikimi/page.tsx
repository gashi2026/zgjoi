import Link from "next/link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { adminIdQueue, idUploadsAvailable } from "@/lib/server/id-verification";
import { dateTime } from "@/lib/format";
import { declineText, idStatusLabels, ID_RETENTION_DAYS_AFTER_APPROVAL, ID_RETENTION_DAYS_AFTER_DECLINE, type IdSide, type IdStatus } from "@/lib/id-verification";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { IdImages, IdDecision } from "@/components/verification/IdReviewer";
export const dynamic = "force-dynamic";

const roleLabel = (r: string) => (r === "PRO" ? "Profesionist" : "Klient");
const waited = (d: Date) => {
  const h = Math.floor((Date.now() - d.getTime()) / 3_600_000);
  return h < 1 ? "më pak se 1 orë" : h < 48 ? `${h} orë` : `${Math.floor(h / 24)} ditë`;
};
const actionLabels: Record<string, string> = {
  ID_SUBMITTED: "Dërgoi dokumentin", ID_APPROVED: "Miratuar", ID_DECLINED: "Refuzuar",
  ID_IMAGES_DELETED: "Fotot u fshinë", ID_IMAGE_VIEWED: "Foto e parë nga administratori",
};

/** Owner's ID queue: oldest pending first, front/back side by side, approve or decline with a reason. */
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const actor = await pageGuard("ADMIN");
  const { id } = await searchParams;
  const { pending, recent, missing } = await adminIdQueue(actor);
  const current = (id && [...pending, ...recent].find((v) => v.id === id)) || pending[0];
  const next = pending.find((v) => v.id !== current?.id);
  const history = current ? await db.auditLog.findMany({
    where: { target: current.id, action: { in: Object.keys(actionLabels).filter((a) => a !== "ID_IMAGE_VIEWED") } }, orderBy: { createdAt: "desc" }, take: 12,
    select: { id: true, action: true, createdAt: true, meta: true, actor: { select: { name: true } } },
  }) : [];
  return (
    <Frame actor={actor} title="Verifikimi i ID-ve"
      subtitle={`Shqyrtoni çdo dokument me dorë. Fotot fshihen automatikisht ${ID_RETENTION_DAYS_AFTER_APPROVAL} ditë pas miratimit dhe ${ID_RETENTION_DAYS_AFTER_DECLINE} ditë pas refuzimit.`}>
      {!idUploadsAvailable() && (
        <Panel><p className="text-sm"><span className="font-semibold">Ngarkimi i ID-ve është i fikur</span> në këtë mjedis (DOCUMENT_UPLOADS_ENABLED). Asnjë përdorues nuk bllokohet derisa ta ndizni.</p></Panel>
      )}
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel>
          <h2 className="font-bold">Në pritje ({pending.length})</h2>
          <p className="mb-3 text-xs text-muted">Më i vjetri i pari · {missing} llogari ende pa dërguar dokument</p>
          {!pending.length && <p className="text-sm text-muted">Asnjë dokument në pritje. 🎉</p>}
          <ol className="space-y-2" data-testid="id-queue">
            {pending.map((v) => (
              <li key={v.id}>
                <Link href={`/admin/verifikimi?id=${v.id}`} className={`block rounded-xl border p-3 text-sm ${v.id === current?.id ? "border-gold bg-honey" : "border-line hover:bg-honey/50"}`}>
                  <span className="block font-semibold">{v.user.name}</span>
                  <span className="block text-muted">{roleLabel(v.user.role)} · pret {waited(v.submittedAt)}{v.attempts > 1 ? ` · prova ${v.attempts}` : ""}</span>
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
                    {roleLabel(current.user.role)}{current.user.city ? ` · ${current.user.city}` : ""} · regjistruar {dateTime(current.user.createdAt)} · dërguar {dateTime(current.submittedAt)}{current.attempts > 1 ? ` · prova ${current.attempts}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${current.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : current.status === "DECLINED" ? "bg-red-100 text-red-800" : "bg-honey"}`}>
                  {idStatusLabels[current.status as IdStatus]}
                </span>
              </div>
              <p className="mb-3 text-sm">Kontrolloni: emri përputhet me <span className="font-semibold">{current.user.name}</span>, dokumenti është i vlefshëm dhe të dyja anët shihen qartë.</p>
              <IdImages id={current.id} sides={current.images.map((i) => i.side as IdSide)} />
              <div className="mt-5">
                {current.status === "PENDING" ? (
                  <IdDecision id={current.id} nextHref={next ? `/admin/verifikimi?id=${next.id}` : "/admin/verifikimi"} />
                ) : (
                  <p className="text-sm">
                    {idStatusLabels[current.status as IdStatus]} më {current.decidedAt ? dateTime(current.decidedAt) : "—"}
                    {current.status === "DECLINED" ? ` · ${declineText(current.declineReason, current.declineNote)}` : ""}
                    {current.imagesDeletedAt ? ` · fotot u fshinë më ${dateTime(current.imagesDeletedAt)}` : current.purgeAfter ? ` · fotot fshihen më ${dateTime(current.purgeAfter)}` : ""}
                  </p>
                )}
              </div>
              {history.length > 0 && (
                <details className="mt-5 text-sm">
                  <summary className="cursor-pointer font-semibold text-gold-dark">Regjistri i auditimit ({history.length})</summary>
                  <ul className="mt-2 space-y-1">
                    {history.map((h) => (
                      <li key={h.id}>{dateTime(h.createdAt)} · {actionLabels[h.action] ?? h.action}{h.actor ? ` · ${h.actor.name}` : " · sistemi"}</li>
                    ))}
                  </ul>
                </details>
              )}
            </Panel>
          ) : (
            <Panel><p>Nuk ka dokumente për shqyrtim.</p></Panel>
          )}
          <Panel>
            <h2 className="mb-3 font-bold">Vendimet e fundit</h2>
            {!recent.length ? <p className="text-sm text-muted">Ende asnjë vendim.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="text-muted"><th className="py-1 pr-3">Përdoruesi</th><th className="pr-3">Roli</th><th className="pr-3">Vendimi</th><th className="pr-3">Data</th><th>Fotot</th></tr></thead>
                  <tbody>
                    {recent.map((v) => (
                      <tr key={v.id} className="border-t border-line">
                        <td className="py-2 pr-3"><Link className="text-gold-dark" href={`/admin/verifikimi?id=${v.id}`}>{v.user.name}</Link></td>
                        <td className="pr-3">{roleLabel(v.user.role)}</td>
                        <td className="pr-3">{idStatusLabels[v.status as IdStatus]}{v.status === "DECLINED" ? ` — ${declineText(v.declineReason, v.declineNote)}` : ""}</td>
                        <td className="pr-3">{v.decidedAt ? dateTime(v.decidedAt) : "—"}</td>
                        <td>{v.imagesDeletedAt ? "fshirë" : v.purgeAfter ? `deri ${dateTime(v.purgeAfter)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </Frame>
  );
}
