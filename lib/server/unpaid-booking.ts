import "server-only";
import type { Payment, Prisma } from "@prisma/client";

export const paymentActivity = { dispute: true, _count: { select: { payouts: true, events: true } } } satisfies Prisma.PaymentInclude;

/** A pending label alone does not prove that no provider operation has begun. */
export function paymentUntouched(payment: (Payment & {
  dispute: unknown;
  _count: { payouts: number; events: number };
}) | null) {
  return !payment || (payment.state === "PENDING" && payment.provider === "disabled" &&
    payment.attempt === 0 && !payment.dispute && !payment._count.payouts && !payment._count.events &&
    !payment.providerCheckoutId && !payment.stripePaymentIntentId && !payment.stripeChargeId &&
    !payment.stripeTransferId && !payment.stripePayoutId && !payment.providerRefundId &&
    !payment.connectedAccountId && !payment.operation && !payment.operationStartedAt &&
    !payment.authorisedAt && !payment.authExpiresAt && !payment.heldAt &&
    !payment.releaseDeadline && !payment.releasedAt && !payment.refundedAt);
}
