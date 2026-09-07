"use server";
import { requireRole } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { startCheckout, refundHeldPayment } from "@/lib/server/payments";
import { changeJob } from "@/lib/server/marketplace";
import { invariant } from "@/lib/server/errors";
export async function beginEscrow(quoteId: string) {
  const user = await requireRole("CLIENT");
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { request: true },
  });
  invariant(
    quote &&
      quote.request.clientId === user.id &&
      quote.request.acceptedQuoteId === quoteId,
    "NOT_FOUND",
    404,
    "Oferta nuk u gjet.",
  );
  return startCheckout(user, quote.requestId);
}
export async function releaseEscrow(requestId: string) {
  return changeJob(
    await requireRole("CLIENT"),
    requestId,
    "CONFIRM_COMPLETION",
  );
}
export async function refundEscrow(requestId: string, reason: string) {
  const user = await requireRole("ADMIN");
  const payment = await db.payment.findUnique({ where: { requestId } });
  invariant(payment, "NOT_FOUND", 404, "Pagesa nuk u gjet.");
  return refundHeldPayment(user, payment.id, reason);
}
