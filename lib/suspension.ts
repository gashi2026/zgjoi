/** Timed and permanent account suspensions, plus erased (tombstone) accounts. */

export type SuspensionFields = {
  suspendedAt: Date | null;
  suspendedUntil?: Date | null;
  deletedAt?: Date | null;
};

/** True when the account must be treated as blocked right now.
 * A timed suspension whose end has passed is not active (it is lifted at login
 * and in the session guard; listings also treat it as expired). */
export function suspensionIsActive(user: SuspensionFields, now = new Date()) {
  if (user.deletedAt) return true;
  if (!user.suspendedAt) return false;
  if (user.suspendedUntil && user.suspendedUntil.getTime() <= now.getTime()) return false;
  return true;
}

/** Prisma filter: a living account that is not currently suspended.
 * Timed suspensions that have already ended are included (so a pro reappears
 * in the catalogue without having to log in first). */
export function activeAccountWhere(now = new Date()) {
  return {
    deletedAt: null,
    OR: [
      { suspendedAt: null },
      { AND: [{ suspendedUntil: { not: null } }, { suspendedUntil: { lte: now } }] },
    ],
  };
}

export type SuspendDuration = "1d" | "7d" | "30d" | "permanent" | "until";
export const SUSPEND_DURATIONS: readonly SuspendDuration[] = ["1d", "7d", "30d", "permanent", "until"];

export function addDays(now: Date, days: number) {
  return new Date(now.getTime() + days * 86400000);
}
