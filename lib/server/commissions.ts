import { invariant } from "./errors";
import { readRecurrence } from "../recurring-bookings";
import "server-only";
import { Prisma, type ServiceRequest } from "@prisma/client";
import { z } from "zod";
import { commissionMonth, eliteWinners, commissionRate, COMMISSION_POLICY_VERSION } from "../commission-policy";
import { allowedCategorySlugs, serviceCategory } from "../service-categories";
import { eligibleRecurringBooking } from "./recurring";
import { serializable } from "./transaction";

const snapshotSchema = z.object({
  version: z.literal(COMMISSION_POLICY_VERSION), month: z.string(), sourceMonth: z.string(),
  winners: z.array(z.object({ profileId: z.string(), categorySlug: z.string(), grossCents: z.number().int().positive().safe() })),
});

export async function eliteMonth(tx: Prisma.TransactionClient, now = new Date(), persist = false) {
  const period = commissionMonth(now);
  // Test money never determines a live commission award. With payments disabled,
  // no external-provider history is currently eligible in this application.
  const testMode = process.env.PAYMENTS_MODE === "stripe_test";
  const key = `commissionElite:${COMMISSION_POLICY_VERSION}:${testMode ? "test" : "live"}:${period.month}`;
  const saved = await tx.setting.findUnique({ where: { key } });
  if (saved) return snapshotSchema.parse(saved.value);
  const rows = testMode ? await tx.$queryRaw<Array<{ profileId: string; categorySlug: string; currentCategory: string; gross: string }>>`
    SELECT r."acceptedProfileId" AS "profileId", r."categorySlug", pp."categorySlug" AS "currentCategory",
      SUM(p.amount)::text AS gross
    FROM public."ServiceRequest" r
    JOIN public."Payment" p ON p."requestId" = r.id
    JOIN public."ProProfile" pp ON pp.id = r."acceptedProfileId"
    JOIN public."User" u ON u.id = pp."userId"
    WHERE r.state = 'COMPLETED' AND r."completedAt" >= ${period.from} AND r."completedAt" < ${period.until}
      AND r."acceptedQuoteId" IS NOT NULL AND p.state IN ('HELD', 'RELEASED')
      AND p.provider = 'stripe_test' AND p."heldAt" IS NOT NULL AND p."refundedAt" IS NULL
      AND pp.verification = 'APPROVED' AND u.role = 'PRO' AND u."suspendedAt" IS NULL
      AND r."categorySlug" IN (${Prisma.join(allowedCategorySlugs)})
      AND NOT EXISTS (SELECT 1 FROM public."Dispute" d WHERE d."paymentId" = p.id)
    GROUP BY r."acceptedProfileId", r."categorySlug", pp."categorySlug"
  ` : [];
  const winners = eliteWinners(rows.filter(row =>
    serviceCategory(row.categorySlug)?.slug === serviceCategory(row.currentCategory)?.slug)
    .map(row => ({ profileId: row.profileId, categorySlug: row.categorySlug, grossCents: Number(row.gross) })));
  const snapshot = { version: COMMISSION_POLICY_VERSION, month: period.month, sourceMonth: period.sourceMonth, winners };
  if (persist) {
    await tx.setting.create({ data: { key, value: snapshot } });
    await tx.auditLog.create({ data: { action: "COMMISSION_MONTH_CLOSED", target: key,
      meta: { month: period.month, sourceMonth: period.sourceMonth, winners: winners.length, testMode } } });
  }
  return snapshot;
}

export async function bookingCommission(tx: Prisma.TransactionClient,
  request: Pick<ServiceRequest, "id" | "clientId" | "categorySlug" | "selectedProfileId" | "answers" | "creationKey">,
  scheduledAt: Date | null, persist = false, now = new Date()) {
  const recurring = await eligibleRecurringBooking(tx, request, scheduledAt);
  invariant(!readRecurrence(request.answers) || recurring, "RECURRENCE_UNAVAILABLE", 409, "Kushtet e rezervimit të përsëritur kanë ndryshuar. Kërkoni një ofertë të re.");
  const snapshot = await eliteMonth(tx, now, persist);
  const elite = snapshot.winners.some(w => w.profileId === request.selectedProfileId &&
    w.categorySlug === serviceCategory(request.categorySlug)?.slug);
  return { ...commissionRate(request.categorySlug, { recurring, elite }), month: snapshot.month };
}

export async function refreshCommissionMonth(now = new Date()) {
  return serializable(async tx => {
    const snapshot = await eliteMonth(tx, now, true);
    return { month: snapshot.month, sourceMonth: snapshot.sourceMonth, winners: snapshot.winners.length };
  });
}
