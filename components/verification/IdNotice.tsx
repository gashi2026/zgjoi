import Link from "next/link";
import type { Actor } from "@/lib/server/auth";
import { CLIENT_BROWSE_ONLY, idCheckPending, idStatusFor, idRequiredMessage } from "@/lib/server/id-verification";
import type { IdStatus } from "@/lib/id-verification";
import HexBadge from "./HexBadge";

/** Banner on every customer/pro account page until the ID is approved. */
export async function IdNotice({ actor }: { actor: Actor }) {
  if (!(await idCheckPending(actor))) return null;
  const status = (await idStatusFor(actor.id))?.status as IdStatus | undefined;
  return (
    <div role="status" data-testid="id-notice" className={`flex items-center gap-3 rounded-2xl border p-3 text-sm sm:p-4 ${status === "DECLINED" ? "border-red-200 bg-red-50" : "border-gold/40 bg-honey"}`}>
      <HexBadge tone={status === "DECLINED" ? "red" : "gold"} size={40}>{status === "PENDING" ? "⏳" : "🪪"}</HexBadge>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{status === "PENDING" ? "Identiteti në shqyrtim" : status === "DECLINED" ? "Verifikimi u refuzua" : "Verifikoni identitetin"}</p>
        <p className="text-ink/80">{idRequiredMessage(actor.role, status)}</p>
      </div>
      {status !== "PENDING" && (
        <Link href="/verifikimi" className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-gold px-4 font-semibold text-ink hover:bg-gold-dark">
          {status === "DECLINED" ? "Ngarko përsëri" : "Verifiko"}
        </Link>
      )}
    </div>
  );
}

/** Replaces a booking/hiring form with the reason it is locked, until the ID is approved. */
export async function IdGate({ actor, children }: { actor: Actor; children: React.ReactNode }) {
  if (!(await idCheckPending(actor))) return <>{children}</>;
  const status = (await idStatusFor(actor.id))?.status as IdStatus | undefined;
  return (
    <div data-testid="id-gate" className="flex flex-col items-start gap-3 rounded-2xl border border-gold/40 bg-honey p-4 sm:flex-row sm:items-center">
      <HexBadge>{status === "PENDING" ? "⏳" : "🔒"}</HexBadge>
      <div className="min-w-0 flex-1">
        <p className="font-bold">Ky veprim kërkon identitet të verifikuar</p>
        <p className="text-sm">{idRequiredMessage(actor.role, status)}</p>
        {actor.role === "CLIENT" && <p className="mt-1 text-xs text-muted">{CLIENT_BROWSE_ONLY}</p>}
      </div>
      {status !== "PENDING" && (
        <Link href="/verifikimi" className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 font-semibold text-ink hover:bg-gold-dark">Verifiko identitetin</Link>
      )}
    </div>
  );
}
