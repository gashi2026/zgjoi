import Link from "next/link";
import { pageGuard } from "@/lib/server/guard";
import { canReviewIds, identityRecordFor } from "@/lib/server/id-verification";
import { dateTime } from "@/lib/format";
import { declineText, idDocumentTypeLabels, idStatusLabels, asDocumentType, type IdStatus } from "@/lib/id-verification";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { PrintButton } from "@/components/verification/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const actionLabels: Record<string, string> = {
  ID_SUBMITTED: "Dokumenti u dërgua", ID_APPROVED: "U miratua", ID_DECLINED: "U refuzua",
  ID_IMAGES_DELETED: "Fotot u fshinë", ID_RECORD_CREATED: "Regjistri u ruajt",
};
const roleLabel = (r: string) => (r === "PRO" ? "Profesionist" : r === "CLIENT" ? "Klient" : r === "ADMIN" ? "Administrator" : "Mbështetje");

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
  const actor = await pageGuard("ADMIN", "SUPPORT");
  if (!(await canReviewIds(actor)))
    return (
      <Frame actor={actor} title="Regjistri i identitetit">
        <Panel><p className="font-semibold">Nuk keni leje për dokumentet e identifikimit.</p>
          <p className="text-sm text-muted">Leja jepet dhe hiqet nga administratori.</p></Panel>
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
          <p className="text-xs uppercase tracking-wide text-muted">Zgjoi · Regjistri i identitetit</p>
          <h1 className="text-2xl font-bold">{r?.legalName ?? user.name}</h1>
          <p className="text-sm text-muted">Konfidencial. Përgatitur më {dateTime(now)} nga {actor.name} ({roleLabel(actor.role)}).</p>
        </div>
        {exporting ? <PrintButton auto /> : (
          <Link href={`/admin/verifikimi/regjistri/${user.id}?eksport=1`} className="print:hidden inline-flex min-h-11 items-center rounded-full bg-gold px-5 font-semibold text-ink hover:bg-gold-dark">📄 Eksporto regjistrin</Link>
        )}
      </header>

      <section>
        <h2 className="mb-2 font-semibold">Të dhënat nga dokumenti</h2>
        {r ? (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {([
              ["Emri dhe mbiemri ligjor", r.legalName],
              ["Data e lindjes", r.birthDate],
              ["Lloji i dokumentit", idDocumentTypeLabels[r.documentType]],
              ["Numri i dokumentit", r.documentNumber],
              ["Shteti lëshues", r.issuingCountry],
              ["Vlen deri më", r.expiresOn],
              ["Verifikuar më", dateTime(r.verifiedAt)],
              ["Verifikuar nga", r.verifiedBy ? `${r.verifiedBy.name} (${roleLabel(r.verifiedBy.role)})` : "—"],
            ] as const).map(([k, val]) => (
              <div key={k} className="border-b border-line/60 py-1"><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold">{val}</dd></div>
            ))}
          </dl>
        ) : <p className="text-muted">Ky përdorues nuk është miratuar ende, prandaj nuk ka regjistër identiteti. Më poshtë janë llogaria dhe historiku.</p>}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Llogaria në Zgjoi</h2>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {([
            ["Emri në llogari", user.name], ["Email", user.email], ["Telefoni", user.phone ?? "—"],
            ["Roli", roleLabel(user.role)], ["Qyteti", user.city ?? "—"], ["Regjistruar më", dateTime(user.createdAt)],
            ["ID e llogarisë", user.id],
            ["Statusi i verifikimit", v ? idStatusLabels[v.status as IdStatus] : "—"],
          ] as const).map(([k, val]) => (
            <div key={k} className="border-b border-line/60 py-1"><dt className="text-xs text-muted">{k}</dt><dd className="break-all font-semibold">{val}</dd></div>
          ))}
        </dl>
        {v && <p className="mt-2 text-xs text-muted">Prova gjithsej: {v.attempts}. {v.imagesDeletedAt ? `Fotot e dokumentit u fshinë më ${dateTime(v.imagesDeletedAt)}.` : v.purgeAfter ? `Fotot e dokumentit fshihen më ${dateTime(v.purgeAfter)}.` : ""}</p>}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Historiku i vendimeve dhe provave</h2>
        {history.length === 0 ? <p className="text-muted">Asnjë ngjarje.</p> : (
          <table className="w-full text-left text-sm">
            <thead><tr className="text-muted"><th className="py-1 pr-3">Data</th><th className="pr-3">Ngjarja</th><th className="pr-3">Nga</th><th>Hollësi</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-line align-top">
                  <td className="py-1 pr-3 whitespace-nowrap">{dateTime(h.createdAt)}</td>
                  <td className="pr-3">{actionLabels[h.action] ?? h.action}</td>
                  <td className="pr-3">{h.actor ? `${h.actor.name} (${roleLabel(h.actor.role)})` : "Sistemi"}</td>
                  <td>{historyText(h.action, h.meta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <footer className="border-t border-line pt-3 text-xs text-muted">
        Ky dokument përmban të dhëna personale. Ndajeni vetëm me autoritetet që e kërkojnë ligjërisht. Çdo hapje dhe eksport i këtij regjistri ruhet në auditim.
      </footer>
    </article>
  );

  if (exporting) return <main className="mx-auto max-w-3xl bg-white p-4 sm:p-8 print:max-w-none print:p-0">{sheet}</main>;
  return (
    <Frame actor={actor} title="Regjistri i identitetit" hideIdNotice>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/verifikimi/regjistri" className="font-semibold text-gold-dark underline">← Të gjitha regjistrat</Link>
        {v && <Link href={`/admin/verifikimi?id=${v.id}`} className="font-semibold text-gold-dark underline">Dokumenti në radhë</Link>}
      </div>
      {sheet}
    </Frame>
  );
}
