/** Dispute rules (owner, 26 Nov 2026). Pure: shared by the UI and the server. */
import { priceJob } from "./book-now";

/** Days after the job ends (completion or cancellation) to open a dispute. */
export const DISPUTE_OPEN_DAYS = 3;
/** Hours the other side has to add their statement. */
export const DISPUTE_RESPONSE_HOURS = 48;

export type DisputeOutcome = "FULL_REFUND" | "PARTIAL_REFUND" | "CREDIT" | "NO_ACTION";
export const outcomeLabels: Record<DisputeOutcome, string> = {
  FULL_REFUND: "Rimbursim i plotë",
  PARTIAL_REFUND: "Rimbursim i pjesshëm",
  CREDIT: "Kredi për klientin",
  NO_ACTION: "Pa veprim",
};

/** Whether a job can still be flagged. Active hired jobs can always be flagged;
 * finished or cancelled ones only within DISPUTE_OPEN_DAYS of their end. */
export function canOpenDispute(job: { state: string; completedAt: Date | null; cancelledAt: Date | null }, now: Date) {
  if (["BOOKED", "IN_PROGRESS"].includes(job.state)) return true;
  const end = job.state === "COMPLETED" ? job.completedAt : job.state === "CANCELLED" ? job.cancelledAt : null;
  return !!end && now.getTime() - end.getTime() <= DISPUTE_OPEN_DAYS * 86_400_000;
}
export function responseDeadline(openedAt: Date) {
  return new Date(openedAt.getTime() + DISPUTE_RESPONSE_HOURS * 3_600_000);
}
/** The admin decides once the other side has answered or the 48 hours have passed. */
export function readyForDecision(d: { respondedAt: Date | null; respondBy: Date | null }, now: Date) {
  return !!d.respondedAt || !d.respondBy || d.respondBy <= now;
}

export type Settlement = {
  finalPriceCents: number;  // price the job settles at (Payment.amount)
  commissionCents: number;  // recalculated from the final price
  proCents: number;
  refundCents: number;      // to return to the customer (admin to-do)
  customerCreditCents: number;
  endsJob: boolean;         // a full refund cancels the job
  todo: { kind: "REFUND" | "CREDIT"; cents: number } | null;
};
/** paidCents = what the customer actually paid (0 while unmarked). creditCents = estimate credit on the job. */
export function settleDispute(input: {
  amountCents: number; commissionBps: number; estimateCreditCents: number; paidCents: number;
  outcome: DisputeOutcome; finalPriceCents?: number | null; customerCreditCents?: number | null;
}): Settlement {
  const { amountCents, commissionBps, estimateCreditCents, paidCents, outcome } = input;
  if (outcome === "FULL_REFUND")
    return { finalPriceCents: amountCents, commissionCents: 0, proCents: 0, refundCents: paidCents, customerCreditCents: 0, endsJob: true,
      todo: paidCents > 0 ? { kind: "REFUND", cents: paidCents } : null };
  const final = input.finalPriceCents ?? amountCents;
  if (!Number.isSafeInteger(final) || final <= 0) throw new Error("Final price must be positive");
  if (outcome === "PARTIAL_REFUND" && final >= amountCents) throw new Error("A partial refund needs a lower final price");
  const price = priceJob(final, commissionBps, estimateCreditCents);
  const refundCents = outcome === "PARTIAL_REFUND" ? Math.max(0, paidCents - price.dueCents) : 0;
  const customerCreditCents = outcome === "CREDIT" ? Math.max(0, input.customerCreditCents ?? 0) : 0;
  if (outcome === "CREDIT" && !customerCreditCents) throw new Error("A credit needs an amount");
  return {
    finalPriceCents: final, commissionCents: price.commissionCents, proCents: price.proCents, refundCents, customerCreditCents, endsJob: false,
    todo: refundCents ? { kind: "REFUND", cents: refundCents } : customerCreditCents ? { kind: "CREDIT", cents: customerCreditCents } : null,
  };
}
