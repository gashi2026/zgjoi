import "server-only";
import type { Prisma } from "@prisma/client";
import { kosovoLocalToIso } from "../scheduling";
import { invariant } from "./errors";
import { addDays, suspensionIsActive, type SuspendDuration, type SuspensionFields } from "../suspension";

type Tx = Pick<Prisma.TransactionClient, "user" | "auditLog">;

/** If a timed suspension has ended, clear it and record it in the audit log. */
export async function liftExpiredSuspension<T extends SuspensionFields & { id: string }>(
  tx: Tx,
  user: T,
  now = new Date(),
) {
  if (user.deletedAt) return false;
  if (!user.suspendedAt || !user.suspendedUntil || user.suspendedUntil.getTime() > now.getTime()) return false;
  await tx.user.update({
    where: { id: user.id },
    data: { suspendedAt: null, suspendedUntil: null, suspensionReason: null },
  });
  await tx.auditLog.create({
    data: { actorId: null, action: "USER_SUSPENSION_EXPIRED", target: user.id, meta: { endedAt: user.suspendedUntil.toISOString() } },
  });
  user.suspendedAt = null;
  user.suspendedUntil = null;
  if ("suspensionReason" in user) (user as T & { suspensionReason?: string | null }).suspensionReason = null;
  return true;
}

/** End of a Kosovo calendar date (23:59), used for a custom "until" date. */
export function endOfKosovoDate(date: string) {
  invariant(/^\d{4}-\d{2}-\d{2}$/.test(date), "UNTIL", 400, "Zgjidhni një datë të vlefshme.");
  try {
    return new Date(kosovoLocalToIso(`${date}T23:59`));
  } catch {
    invariant(false, "UNTIL", 400, "Zgjidhni një datë të vlefshme.");
  }
}

export function resolveSuspendedUntil(duration: SuspendDuration, untilDate: string | undefined, now = new Date()) {
  if (duration === "permanent") return null;
  if (duration === "1d") return addDays(now, 1);
  if (duration === "7d") return addDays(now, 7);
  if (duration === "30d") return addDays(now, 30);
  invariant(untilDate, "UNTIL", 400, "Zgjidhni datën deri kur vlen pezullimi.");
  const at = endOfKosovoDate(untilDate);
  invariant(at.getTime() > now.getTime(), "UNTIL", 400, "Data e pezullimit duhet të jetë në të ardhmen.");
  return at;
}

export { suspensionIsActive };
