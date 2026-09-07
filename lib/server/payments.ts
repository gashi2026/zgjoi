import "server-only";
import Stripe from "stripe";
import { db } from "./db";
import type { Actor } from "./auth";
import { AppError, invariant } from "./errors";
import { serializable } from "./marketplace";
import { applicationUrl, notify } from "./notifications";
import { entityId } from "../marketplace-validation";

/** Sandbox preparation only. Live money requires a separate approved provider release. */
export function paymentsReady() {
  return (
    process.env.PAYMENTS_MODE === "stripe_test" &&
    Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) &&
    Boolean(applicationUrl())
  );
}
export function paymentProvider() {
  invariant(
    paymentsReady(),
    "PAYMENTS_UNAVAILABLE",
    503,
    "Pagesat online nuk janë ende të disponueshme. Nuk është bërë asnjë pagesë.",
  );
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
    maxNetworkRetries: 2,
    timeout: 10000,
  });
}

export async function startCheckout(actor: Actor, requestId: string) {
  entityId.parse(requestId);
  invariant(
    actor.role === "CLIENT",
    "FORBIDDEN",
    403,
    "Vetëm klienti mund të paguajë.",
  );
  const payment = await db.payment.findUnique({
    where: { requestId },
    include: {
      request: {
        include: {
          acceptedQuote: true,
          acceptedPro: {
            include: { user: { select: { suspendedAt: true, role: true } } },
          },
        },
      },
    },
  });
  invariant(
    payment && payment.request.clientId === actor.id,
    "NOT_FOUND",
    404,
    "Pagesa nuk u gjet.",
  );
  invariant(
    payment.state === "PENDING" &&
      payment.request.state === "BOOKED" &&
      payment.request.acceptedQuote?.state === "ACCEPTED" &&
      payment.request.acceptedQuote.amount === payment.amount,
    "STATE",
    409,
    "Pagesa nuk mund të niset në këtë gjendje.",
  );
  invariant(
    actor.emailVerified,
    "VERIFY_EMAIL",
    409,
    "Verifikoni emailin tuaj para pagesës.",
  );
  const stripe = paymentProvider();
  const destination =
    payment.connectedAccountId ?? payment.request.acceptedPro?.stripeAccountId;
  invariant(
    destination &&
      payment.request.acceptedPro?.verification === "APPROVED" &&
      !payment.request.acceptedPro.user.suspendedAt &&
      payment.request.acceptedPro.user.role === "PRO",
    "PRO_PAYMENTS",
    409,
    "Profesionisti duhet të përfundojë konfigurimin e pagesave.",
  );
  const account = await stripe.accounts.retrieve(destination);
  invariant(
    account.charges_enabled && account.payouts_enabled,
    "PRO_PAYMENTS",
    409,
    "Llogaria e pagesave të profesionistit nuk është gati.",
  );
  if (payment.providerCheckoutId) {
    const existing = await stripe.checkout.sessions.retrieve(
      payment.providerCheckoutId,
    );
    if (existing.status === "open" && existing.url)
      return { ok: true, url: existing.url };
    invariant(
      existing.status === "expired",
      "PROCESSING",
      409,
      "Pagesa po përpunohet. Prisni konfirmimin.",
    );
    await db.payment.updateMany({
      where: {
        id: payment.id,
        state: "PENDING",
        providerCheckoutId: existing.id,
      },
      data: { providerCheckoutId: null, attempt: { increment: 1 } },
    });
  }
  await db.payment.updateMany({
    where: {
      id: payment.id,
      state: "PENDING",
      attempt: 0,
      request: { state: "BOOKED" },
    },
    data: {
      attempt: 1,
      provider: "stripe_test",
      connectedAccountId: destination,
    },
  });
  const current = await db.payment.findUniqueOrThrow({
    where: { id: payment.id },
    include: { request: true },
  });
  invariant(
    current.state === "PENDING" &&
      current.request.state === "BOOKED" &&
      current.attempt > 0,
    "STATE",
    409,
    "Kërkesa ka ndryshuar.",
  );
  const base = applicationUrl()!;
  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      client_reference_id: current.id,
      metadata: {
        paymentId: current.id,
        requestId,
        attempt: String(current.attempt),
      },
      customer_email: actor.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: current.amount,
            product_data: { name: payment.request.title },
          },
        },
      ],
      payment_intent_data: {
        metadata: { paymentId: current.id, requestId },
        transfer_group: `zgjoi_${current.id}`,
      },
      success_url: `${base}/llogaria/kerkesat/${requestId}?payment=processing`,
      cancel_url: `${base}/llogaria/kerkesat/${requestId}?payment=cancelled`,
    },
    { idempotencyKey: `checkout:${current.id}:${current.attempt}` },
  );
  await db.payment.updateMany({
    where: { id: current.id, state: "PENDING", attempt: current.attempt },
    data: { providerCheckoutId: checkout.id },
  });
  invariant(
    checkout.url,
    "PROVIDER",
    502,
    "Faqja e pagesës nuk u hap. Provoni përsëri.",
  );
  return { ok: true, url: checkout.url };
}

export async function applyCheckoutEvent(event: Stripe.Event) {
  invariant(
    !event.livemode,
    "LIVE_DISABLED",
    400,
    "Live payment events are not enabled.",
  );
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  )
    return { received: true, ignored: true };
  const session = event.data.object as Stripe.Checkout.Session;
  const stripe = paymentProvider();
  const intentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  invariant(
    intentId && session.payment_status === "paid",
    "PAYMENT_PENDING",
    409,
    "Payment is not settled.",
  );
  const intent = await stripe.paymentIntents.retrieve(intentId, {
    expand: ["latest_charge"],
  });
  const charge = intent.latest_charge as Stripe.Charge | null;
  invariant(
    intent.status === "succeeded" &&
      charge &&
      charge.paid &&
      charge.captured &&
      !charge.refunded &&
      !charge.disputed &&
      !intent.livemode,
    "PAYMENT_PENDING",
    409,
    "Payment is not settled.",
  );
  return recordSettledCheckout({
    eventId: event.id,
    checkoutId: session.id,
    paymentId: session.client_reference_id ?? "",
    intentId,
    chargeId: charge.id,
    amount: session.amount_total ?? -1,
    received: intent.amount_received,
    currency: session.currency ?? "",
    intentCurrency: intent.currency,
    attempt: session.metadata?.attempt ?? "",
  });
}

/** Pure database boundary; input is accepted only from a signature-verified provider handler. */
export async function recordSettledCheckout(event: {
  eventId: string;
  checkoutId: string;
  paymentId: string;
  intentId: string;
  chargeId: string;
  amount: number;
  received: number;
  currency: string;
  intentCurrency: string;
  attempt: string;
}) {
  return serializable(async (tx) => {
    if (
      await tx.paymentEvent.findUnique({
        where: {
          provider_eventId: { provider: "stripe_test", eventId: event.eventId },
        },
      })
    )
      return { received: true, duplicate: true };
    const payment = await tx.payment.findUnique({
      where: { id: event.paymentId },
      include: {
        request: { include: { acceptedPro: { select: { userId: true } } } },
      },
    });
    invariant(
      payment &&
        payment.provider === "stripe_test" &&
        payment.providerCheckoutId === event.checkoutId &&
        String(payment.attempt) === event.attempt &&
        payment.amount === event.amount &&
        payment.amount === event.received &&
        event.currency === "eur" &&
        event.intentCurrency === "eur" &&
        payment.request.acceptedQuoteId,
      "EVENT_MISMATCH",
      409,
      "Payment event does not match the accepted offer.",
    );
    invariant(
      payment.state === "PENDING" ||
        (payment.stripePaymentIntentId === event.intentId &&
          payment.stripeChargeId === event.chargeId &&
          [
            "HELD",
            "RELEASED",
            "DISPUTED",
            "REFUND_PENDING",
            "REFUNDED",
          ].includes(payment.state)),
      "STALE_EVENT",
      409,
      "Payment state has changed.",
    );
    if (payment.state === "PENDING") {
      invariant(
        payment.request.state === "BOOKED",
        "STALE_EVENT",
        409,
        "The booking is not awaiting payment.",
      );
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          state: "HELD",
          heldAt: new Date(),
          stripePaymentIntentId: event.intentId,
          stripeChargeId: event.chargeId,
        },
      });
      if (payment.request.acceptedPro)
        await notify(
          tx,
          payment.request.acceptedPro.userId,
          "FUNDED",
          "Pagesa u konfirmua; puna mund të fillojë",
          `/pro/kerkesat/${payment.requestId}`,
        );
      await notify(
        tx,
        payment.request.clientId,
        "FUNDED",
        "Pagesa juaj u konfirmua",
        `/llogaria/kerkesat/${payment.requestId}`,
      );
      await tx.auditLog.create({
        data: {
          action: "PAYMENT_HELD",
          target: payment.id,
          meta: { amount: payment.amount },
        },
      });
    }
    await tx.paymentEvent.create({
      data: {
        provider: "stripe_test",
        eventId: event.eventId,
        paymentId: payment.id,
        kind: "CHECKOUT_SETTLED",
        processedAt: new Date(),
      },
    });
    return { received: true };
  });
}

export async function releasePayment(actor: Actor, paymentId: string) {
  invariant(actor.role === "ADMIN", "FORBIDDEN", 403, "Nuk keni qasje.");
  entityId.parse(paymentId);
  const stripe = paymentProvider();
  const payment = await serializable(async (tx) => {
    const p = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { request: true, dispute: true, payouts: true },
    });
    invariant(
      p &&
        p.request.state === "COMPLETED" &&
        p.request.completedAt &&
        !p.dispute &&
        p.connectedAccountId &&
        p.stripeChargeId &&
        p.request.acceptedProfileId &&
        p.provider === "stripe_test",
      "STATE",
      409,
      "Lirimi kërkon përfundim të konfirmuar dhe pagesë pa kontest.",
    );
    if (p.state === "RELEASED" && p.stripeTransferId) return p;
    invariant(
      p.state === "HELD" && (!p.operation || p.operation === "RELEASE"),
      "STATE",
      409,
      "Pagesa nuk mund të lirohet në këtë gjendje.",
    );
    invariant(
      !p.operationStartedAt ||
        p.operationStartedAt.getTime() > Date.now() - 23 * 3600000,
      "RECONCILE",
      409,
      "Kontrolloni veprimin te ofruesi para riprovimit.",
    );
    await tx.payment.update({
      where: { id: p.id },
      data: {
        operation: "RELEASE",
        operationStartedAt: p.operationStartedAt ?? new Date(),
      },
    });
    await tx.payout.upsert({
      where: { paymentId: p.id },
      create: {
        profileId: p.request.acceptedProfileId,
        paymentId: p.id,
        amount: p.proAmount,
        scheduledFor: new Date(),
        providerOperationKey: `release:${p.id}`,
      },
      update: {},
    });
    return p;
  });
  if (payment.state === "RELEASED") return { ok: true, already: true };
  const transfer = await stripe.transfers.create(
    {
      amount: payment.proAmount,
      currency: "eur",
      destination: payment.connectedAccountId!,
      source_transaction: payment.stripeChargeId!,
      transfer_group: `zgjoi_${payment.id}`,
      metadata: { paymentId: payment.id },
    },
    { idempotencyKey: `release:${payment.id}` },
  );
  invariant(
    transfer.amount === payment.proAmount &&
      transfer.currency === "eur" &&
      transfer.destination === payment.connectedAccountId,
    "PROVIDER_MISMATCH",
    502,
    "Përgjigjja e pagesës kërkon shqyrtim.",
  );
  await serializable(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        state: "RELEASED",
        releasedAt: new Date(),
        stripeTransferId: transfer.id,
        operation: null,
      },
    });
    await tx.payout.update({
      where: { paymentId: payment.id },
      data: { state: "TRANSFERRED", reference: transfer.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "FUNDS_TRANSFERRED",
        target: payment.id,
        meta: { amount: payment.proAmount, transferId: transfer.id },
      },
    });
  });
  // TRANSFERRED is distinct from a confirmed bank payout. Never mark PAID here.
  return {
    ok: true,
    message:
      "Transferimi te llogaria e profesionistit u konfirmua. Pagesa bankare mbetet për t'u konfirmuar.",
  };
}

export async function refundHeldPayment(
  actor: Actor,
  paymentId: string,
  reason: string,
) {
  invariant(
    actor.role === "ADMIN" &&
      reason.trim().length >= 20 &&
      reason.length <= 4000,
    "FORBIDDEN",
    403,
    "Shkruani arsyen e plotë të rimbursimit.",
  );
  entityId.parse(paymentId);
  const stripe = paymentProvider();
  const payment = await serializable(async (tx) => {
    const p = await tx.payment.findUnique({ where: { id: paymentId } });
    invariant(
      p &&
        p.provider === "stripe_test" &&
        p.stripePaymentIntentId &&
        !p.stripeTransferId &&
        ["HELD", "DISPUTED", "REFUND_PENDING", "REFUNDED"].includes(p.state) &&
        (!p.operation || p.operation === "REFUND"),
      "STATE",
      409,
      "Kjo pagesë kërkon shqyrtim manual para rimbursimit.",
    );
    invariant(
      !p.operationStartedAt ||
        p.providerRefundId ||
        p.operationStartedAt.getTime() > Date.now() - 23 * 3600000,
      "RECONCILE",
      409,
      "Kontrolloni rimbursimin te ofruesi para riprovimit.",
    );
    if (p.state !== "REFUNDED")
      await tx.payment.update({
        where: { id: p.id },
        data: {
          operation: "REFUND",
          operationStartedAt: p.operationStartedAt ?? new Date(),
          state: "REFUND_PENDING",
        },
      });
    return p;
  });
  if (payment.state === "REFUNDED") return { ok: true, already: true };
  const refund = payment.providerRefundId
    ? await stripe.refunds.retrieve(payment.providerRefundId)
    : await stripe.refunds.create(
        {
          payment_intent: payment.stripePaymentIntentId!,
          amount: payment.amount,
          metadata: { paymentId: payment.id },
        },
        { idempotencyKey: `refund:${payment.id}` },
      );
  invariant(
    refund.amount === payment.amount &&
      refund.currency === "eur" &&
      refund.payment_intent === payment.stripePaymentIntentId,
    "PROVIDER_MISMATCH",
    502,
    "Rimbursimi kërkon shqyrtim.",
  );
  await serializable(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        providerRefundId: refund.id,
        ...(refund.status === "succeeded"
          ? { state: "REFUNDED", refundedAt: new Date(), operation: null }
          : {}),
      },
    });
    if (refund.status === "succeeded") {
      await tx.serviceRequest.update({
        where: { id: payment.requestId },
        data: {
          state: "CANCELLED",
          cancelledAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.dispute.updateMany({
        where: { paymentId: payment.id, resolvedAt: null },
        data: { resolution: reason, outcome: "REFUND", resolvedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PAYMENT_REFUNDED",
          target: payment.id,
          meta: { amount: payment.amount, refundId: refund.id },
        },
      });
    }
  });
  return {
    ok: true,
    message:
      refund.status === "succeeded"
        ? "Rimbursimi u konfirmua."
        : "Rimbursimi është në përpunim; nuk është shënuar si i përfunduar.",
  };
}
