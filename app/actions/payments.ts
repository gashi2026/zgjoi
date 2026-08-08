"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { commissionBps, splitAmount } from "@/lib/server/settings";
import {
  captureHold,
  cancelHold,
  createAuthHold,
  createDestinationCharge,
  releasePayout,
  refundCharge,
} from "@/lib/server/stripe";
import {
  chooseStrategy,
  captureDeadlineFrom,
  ledgerDeadlineFrom,
  type EscrowStrategy,
} from "@/lib/escrow";

/* ------------------------------------------------- start the payment */

/**
 * Called when the client accepts a quote. Picks the strategy from the
 * professional's own estimate of how long the job takes.
 */
export async function beginEscrow(quoteId: string) {
  const user = await requireUser();

  const quote = await db.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: {
      request: true,
      profile: { select: { id: true, stripeAccountId: true, stripeOnboarded: true } },
    },
  });
  if (quote.request.clientId !== user.id) throw new Error("FORBIDDEN");

  const strategy: EscrowStrategy = chooseStrategy(quote.expectedDays);
  const bps = await commissionBps();
  const { commissionAmount, proAmount } = splitAmount(quote.amount, bps);

  /* A long job cannot start without a connected account — there is nowhere
     to park the money. Fall back to a hold and tell the caller why. */
  if (strategy === "DESTINATION_CHARGE" && !quote.profile.stripeAccountId) {
    return {
      ok: false as const,
      error:
        "Profesionisti nuk e ka përfunduar ende konfigurimin e pagesave. " +
        "Nuk mund të nisim pagesën për punë afatgjata.",
    };
  }

  const result =
    strategy === "AUTH_HOLD"
      ? await createAuthHold({
          amount: quote.amount,
          requestId: quote.requestId,
          clientEmail: user.email,
          connectedAccountId: quote.profile.stripeAccountId,
          commissionAmount,
        })
      : await createDestinationCharge({
          amount: quote.amount,
          requestId: quote.requestId,
          clientEmail: user.email,
          connectedAccountId: quote.profile.stripeAccountId!,
          commissionAmount,
        });

  const payment = await db.payment.upsert({
    where: { requestId: quote.requestId },
    create: {
      requestId: quote.requestId,
      amount: quote.amount,
      commissionBps: bps,
      commissionAmount,
      proAmount,
      strategy,
      state: "PENDING",
      stripePaymentIntentId: result.id,
      authExpiresAt: strategy === "AUTH_HOLD" ? captureDeadlineFrom() : null,
      releaseDeadline: strategy === "DESTINATION_CHARGE" ? ledgerDeadlineFrom() : null,
    },
    update: {
      amount: quote.amount,
      commissionBps: bps,
      commissionAmount,
      proAmount,
      strategy,
      stripePaymentIntentId: result.id,
      authExpiresAt: strategy === "AUTH_HOLD" ? captureDeadlineFrom() : null,
      releaseDeadline: strategy === "DESTINATION_CHARGE" ? ledgerDeadlineFrom() : null,
    },
  });

  return {
    ok: true as const,
    strategy,
    paymentId: payment.id,
    clientSecret: "clientSecret" in result ? result.clientSecret : null,
    demo: result.demo,
  };
}

/* ------------------------------------------ release on job completion */

/**
 * The single place money reaches the professional. Which Stripe call runs
 * depends on the strategy, but the trigger is always the same: the client
 * confirmed the work.
 */
export async function releaseEscrow(requestId: string) {
  const payment = await db.payment.findUniqueOrThrow({
    where: { requestId },
    include: {
      request: { include: { acceptedPro: { select: { id: true, stripeAccountId: true } } } },
    },
  });

  if (payment.state === "RELEASED") return { ok: true as const, already: true };
  const pro = payment.request.acceptedPro;
  if (!pro) return { ok: false as const, error: "Kjo punë nuk ka profesionist." };

  if (payment.strategy === "AUTH_HOLD") {
    if (!payment.stripePaymentIntentId) {
      return { ok: false as const, error: "Mungon pagesa te Stripe." };
    }
    if (payment.authExpiresAt && payment.authExpiresAt < new Date()) {
      await db.payment.update({ where: { id: payment.id }, data: { state: "EXPIRED" } });
      return {
        ok: false as const,
        error:
          "Rezervimi i kartës ka skaduar. Kërko nga klienti ta rifillojë pagesën.",
      };
    }
    const captured = await captureHold(payment.stripePaymentIntentId);
    await db.payment.update({
      where: { id: payment.id },
      data: {
        state: "RELEASED",
        heldAt: new Date(),
        releasedAt: new Date(),
        stripeChargeId: captured.chargeId ?? null,
      },
    });
  } else {
    if (!pro.stripeAccountId) {
      return { ok: false as const, error: "Profesionisti nuk ka llogari pagesash." };
    }
    const payout = await releasePayout({
      connectedAccountId: pro.stripeAccountId,
      amount: payment.proAmount,
      requestId,
    });
    await db.payment.update({
      where: { id: payment.id },
      data: { state: "RELEASED", releasedAt: new Date(), stripePayoutId: payout.payoutId },
    });
  }

  await db.payout.create({
    data: {
      profileId: pro.id,
      paymentId: payment.id,
      amount: payment.proAmount,
      state: "PAID",
      paidAt: new Date(),
      scheduledFor: new Date(),
    },
  });

  await db.auditLog.create({
    data: { action: "ESCROW_RELEASED", target: requestId, meta: { strategy: payment.strategy } },
  });

  revalidatePath("/pro/te-ardhurat");
  return { ok: true as const };
}

/* ----------------------------------------------------------- refunds */

export async function refundEscrow(requestId: string, reason: string) {
  const payment = await db.payment.findUniqueOrThrow({ where: { requestId } });
  if (!payment.stripePaymentIntentId) return { ok: false as const };

  if (payment.strategy === "AUTH_HOLD" && payment.state !== "RELEASED") {
    // never captured, so just let the hold go
    await cancelHold(payment.stripePaymentIntentId);
  } else {
    await refundCharge(payment.stripePaymentIntentId, reason);
  }

  await db.payment.update({
    where: { id: payment.id },
    data: { state: "REFUNDED", refundedAt: new Date() },
  });
  await db.auditLog.create({
    data: { action: "ESCROW_REFUNDED", target: requestId, meta: { reason } },
  });

  return { ok: true as const };
}
