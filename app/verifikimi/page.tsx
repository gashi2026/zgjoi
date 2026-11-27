import Link from "next/link";
import { redirect } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { accountHome } from "@/lib/server/auth";
import { idStatusFor, idUploadsAvailable } from "@/lib/server/id-verification";
import { dateTime } from "@/lib/format";
import { declineText, needsIdCheck } from "@/lib/id-verification";
import Frame, { Panel } from "@/components/marketplace/Frame";
import IdUploadForm from "@/components/verification/IdUploadForm";
import PrivacyNote from "@/components/verification/PrivacyNote";
import HexBadge from "@/components/verification/HexBadge";

/** Customers and pros upload the front and back of their ID; Zgjoi approves or declines by hand. */
export default async function Page({ searchParams }: { searchParams: Promise<{ fillim?: string }> }) {
  const actor = await pageGuard();
  if (!needsIdCheck(actor.role)) redirect(accountHome(actor.role));
  const { fillim } = await searchParams;
  const row = await idStatusFor(actor.id);
  const available = idUploadsAvailable();
  const pro = actor.role === "PRO";
  const unlocks = pro ? "të shfaqeni në kërkim dhe të pranoni punë" : "të rezervoni, të punësoni dhe të kërkoni vlerësime";
  return (
    <Frame actor={actor} hideIdNotice title="Verifikimi i identitetit"
      subtitle={`Çdo klient dhe profesionist në Zgjoi verifikohet. Pas miratimit mund ${unlocks}.`}>
      {fillim && !row && (
        <Panel>
          <p className="font-bold">Llogaria u krijua. Hapi i fundit: verifikoni identitetin.</p>
          <p className="text-sm text-muted">Zgjat rreth një minutë. Deri atëherë mund të shfletoni profesionistët.</p>
          <Link href={accountHome(actor.role)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-gold-dark">Më vonë — vazhdo te paneli →</Link>
        </Panel>
      )}
      {!available ? (
        <Panel>
          <p className="font-semibold">Ngarkimi i dokumenteve nuk është ende i disponueshëm.</p>
          <p className="text-sm text-muted">Do t&apos;ju njoftojmë kur të hapet. Deri atëherë llogaria juaj funksionon si zakonisht.</p>
        </Panel>
      ) : row?.status === "APPROVED" ? (
        <Panel>
          <div className="flex items-center gap-4" data-testid="id-status-approved">
            <HexBadge tone="green">✓</HexBadge>
            <div>
              <p className="text-lg font-bold">Identiteti juaj është verifikuar</p>
              <p className="text-sm text-muted">Miratuar më {row.decidedAt ? dateTime(row.decidedAt) : "—"}. {row.imagesDeletedAt ? "Fotot e dokumentit janë fshirë." : "Fotot fshihen automatikisht pas afatit të ruajtjes."}</p>
            </div>
          </div>
        </Panel>
      ) : row?.status === "PENDING" ? (
        <Panel>
          <div className="flex items-center gap-4" data-testid="id-status-pending">
            <HexBadge>⏳</HexBadge>
            <div>
              <p className="text-lg font-bold">Dokumenti juaj është në shqyrtim</p>
              <p className="text-sm text-muted">Dërguar më {dateTime(row.submittedAt)}. Zakonisht e shqyrtojmë brenda 24 orëve dhe ju njoftojmë këtu{actor.emailVerified ? " dhe me email" : ""}.</p>
            </div>
          </div>
          <details className="mt-4 rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gold-dark">Gabuat foton? Zëvendësoni fotot</summary>
            <div className="mt-3"><IdUploadForm resubmit /></div>
          </details>
        </Panel>
      ) : (
        <Panel>
          {row?.status === "DECLINED" ? (
            <div className="mb-4 flex items-start gap-4 rounded-xl bg-red-50 p-3" data-testid="id-status-declined" role="alert">
              <HexBadge tone="red" size={44}>!</HexBadge>
              <div>
                <p className="font-bold">Verifikimi u refuzua</p>
                <p className="text-sm"><span className="font-semibold">Arsyeja:</span> {declineText(row.declineReason, row.declineNote)}</p>
                <p className="text-sm text-muted">Ngarkoni foto të reja më poshtë; i shqyrtojmë sërish.</p>
              </div>
            </div>
          ) : (
            <h2 className="mb-1 text-lg font-bold">Fotografoni dokumentin tuaj</h2>
          )}
          <p className="mb-4 text-sm text-muted">Na duhen dy foto: ana e përparme dhe ana e pasme e dokumentit tuaj të identifikimit.</p>
          <IdUploadForm resubmit={row?.status === "DECLINED"} />
        </Panel>
      )}
      <PrivacyNote />
    </Frame>
  );
}
