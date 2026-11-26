import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { notify } from "./notifications";
import { arrivalTime } from "../arrival";
import { summarizeTrust, shouldAlert, CANCELLATION_WINDOW_DAYS, CANCELLATION_ALERT_THRESHOLD, PRO_SIDE_CANCELLATIONS } from "../trust";

type TrustDB = Pick<Prisma.TransactionClient, "serviceRequest">;
/** Hired jobs only (an accepted quote or a Book now booking). */
export async function proTrust(profileId: string, tx: TrustDB = db, now = new Date()) {
  const jobs = await tx.serviceRequest.findMany({
    where: { acceptedProfileId: profileId, acceptedQuoteId: { not: null } },
    select: { state: true, scheduledAt: true, startedAt: true, cancelledAt: true, cancelledBy: true, payment: { select: { dispute: { select: { id: true } } } },
      booking: { select: { startsAt: true, arrival: { select: { checkedInAt: true } } } } },
    take: 5000,
  });
  // A Book now booking keeps its own start time (moved by reschedules); prefer it.
  return summarizeTrust(jobs.map(j => ({ ...j, scheduledAt: j.booking?.startsAt ?? j.scheduledAt, arrivedAt: arrivalTime(j.booking?.arrival, j.startedAt), hasDispute: !!j.payment?.dispute })), now);
}

/** Call after a pro-side cancellation. Alerts admins once per 90-day window. */
export async function checkCancellationAlert(tx: Prisma.TransactionClient, profileId: string, now = new Date()) {
  const since = new Date(now.getTime() - CANCELLATION_WINDOW_DAYS * 86_400_000);
  const count = await tx.serviceRequest.count({ where: { acceptedProfileId: profileId, state: "CANCELLED",
    cancelledBy: { in: PRO_SIDE_CANCELLATIONS }, cancelledAt: { gte: since } } });
  if (!shouldAlert(count)) return { alerted: false, count };
  const recent = await tx.auditLog.findFirst({ where: { action: "PRO_REVIEW_ALERT", target: profileId, createdAt: { gte: since } }, select: { id: true } });
  if (recent) return { alerted: false, count };
  const profile = await tx.proProfile.findUnique({ where: { id: profileId }, select: { user: { select: { name: true } } } });
  const admins = await tx.user.findMany({ where: { role: "ADMIN", suspendedAt: null }, select: { id: true } });
  for (const admin of admins)
    await notify(tx, admin.id, "PRO_REVIEW", `Shqyrtoni profesionistin ${profile?.user.name ?? ""}: ${count} anulime në ${CANCELLATION_WINDOW_DAYS} ditë`, "/admin/perdoruesit");
  await tx.auditLog.create({ data: { action: "PRO_REVIEW_ALERT", target: profileId, meta: { count, threshold: CANCELLATION_ALERT_THRESHOLD, windowDays: CANCELLATION_WINDOW_DAYS } } });
  return { alerted: true, count };
}
