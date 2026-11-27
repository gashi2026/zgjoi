import Link from "next/link";
import { pageGuard } from "@/lib/server/guard";
import { canReviewIds, listIdentityRecords } from "@/lib/server/id-verification";
import { dateTime } from "@/lib/format";
import { asDocumentType, idDocumentTypeLabels } from "@/lib/id-verification";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { inputClass, buttonClass } from "@/components/marketplace/ApiForm";

export const dynamic = "force-dynamic";

/** Permanent identity records (kept after the photos are deleted). List shows no decrypted data. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await pageGuard("ADMIN", "SUPPORT");
  if (!(await canReviewIds(actor)))
    return (
      <Frame actor={actor} title="Regjistri i identiteteve">
        <Panel><p className="font-semibold">Nuk keni leje për dokumentet e identifikimit.</p>
          <p className="text-sm text-muted">Leja jepet dhe hiqet nga administratori.</p></Panel>
      </Frame>
    );
  const { q = "" } = await searchParams;
  const rows = await listIdentityRecords(actor, q);
  return (
    <Frame actor={actor} title="Regjistri i identiteteve" subtitle="Të dhënat e verifikuara ruhen përgjithmonë për qëllime ligjore dhe sigurie, edhe pasi fotot fshihen.">
      <Link href="/admin/verifikimi" className="text-sm font-semibold text-gold-dark underline">← Radha e verifikimit</Link>
      <Panel>
        <form className="flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Emri, email-i ose 4 shifrat e fundit të dokumentit" aria-label="Kërko në regjistër" className={`${inputClass} min-w-0 flex-1`} />
          <button className={buttonClass}>Kërko</button>
        </form>
        <p className="mt-2 text-xs text-muted">Hapja e një regjistri dhe eksportimi regjistrohen në auditim.</p>
      </Panel>
      <Panel>
        {rows.length === 0 ? <p className="text-muted">Asnjë regjistër{q ? " për këtë kërkim" : " ende"}.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-muted"><th className="py-2 pr-3">Emri ligjor</th><th className="pr-3">Llogaria</th><th className="pr-3">Dokumenti</th><th className="pr-3">Nr.</th><th className="pr-3">Shteti</th><th>Verifikuar</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId} className="border-t border-line">
                    <td className="py-2 pr-3"><Link className="font-semibold text-gold-dark" href={`/admin/verifikimi/regjistri/${r.userId}`}>{r.legalName}</Link></td>
                    <td className="pr-3">{r.user.email}<span className="block text-xs text-muted">{r.user.role === "PRO" ? "Profesionist" : "Klient"}</span></td>
                    <td className="pr-3">{idDocumentTypeLabels[asDocumentType(r.documentType)]}</td>
                    <td className="pr-3 font-mono">•••• {r.documentNoLast4}</td>
                    <td className="pr-3">{r.issuingCountry}</td>
                    <td>{dateTime(r.verifiedAt)}</td>
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
