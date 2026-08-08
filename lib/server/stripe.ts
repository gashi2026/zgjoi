import "server-only";
import Stripe from "stripe";
import {
  authExpiryFrom,
  ledgerDeadlineFrom,
  type EscrowStrategy,
} from "@/lib/escrow";

/**
 * Two escrow strategies, chosen per job by expected duration.
 *
 *  AUTH_HOLD  (jobs ≤ 5 days)
 *    PaymentIntent with capture_method: "manual".
 *    Money stays in the client's account, frozen. We capture on completion.
 *    Hard limit: the authorisation lapses after 7 days.
 *
 *  DESTINATION_CHARGE  (jobs > 5 days, up to 90)
 *    Charge immediately with transfer_data.destination = the professional's
 *    connected account, whose payout schedule is set to MANUAL. The money
 *    sits in their Stripe ledger where they can see it but cannot withdraw
 *    it. We call the Payout API on completion.
 *    Hard limit: Stripe requires release or refund within ~90 days.
 *
 * Without STRIPE_SECRET_KEY every function below returns a demo result, so
 * the app still runs end to end without charging anyone.
 */
export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe = stripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
  : null;

const demo = <T extends object>(extra: T) => ({ demo: true as const, ...extra });

/* ------------------------------------------------ connected accounts */

/**
 * Express account with MANUAL payouts. The manual schedule is the whole
 * mechanism: it is what stops the professional withdrawing early.
 */
export async function createConnectedAccount(params: {
  email: string;
  name: string;
  country?: string;
}) {
  if (!stripe) return demo({ accountId: `acct_demo_${Date.now()}` });

  const account = await stripe.accounts.create({
    type: "express",
    country: params.country ?? "XK",
    email: params.email,
    business_type: "individual",
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
    settings: {
      payouts: {
        schedule: { interval: "manual" }, // <- locks the ledger
      },
    },
    metadata: { platform: "zgjoi", name: params.name },
  });

  return { demo: false as const, accountId: account.id };
}

export async function onboardingLink(accountId: string, returnUrl: string) {
  if (!stripe) return demo({ url: returnUrl });
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: returnUrl,
    return_url: returnUrl,
  });
  return { demo: false as const, url: link.url };
}

export async function accountStatus(accountId: string) {
  if (!stripe) return demo({ onboarded: true, payoutsManual: true });
  const acct = await stripe.accounts.retrieve(accountId);
  return {
    demo: false as const,
    onboarded: Boolean(acct.details_submitted && acct.charges_enabled),
    payoutsManual: acct.settings?.payouts?.schedule?.interval === "manual",
  };
}

/* ------------------------------------- strategy 1: authorise and hold */

export async function createAuthHold(params: {
  amount: number; // cents
  requestId: string;
  clientEmail: string;
  connectedAccountId?: string | null;
  commissionAmount: number;
}) {
  const authExpiresAt = authExpiryFrom();

  if (!stripe) {
    return demo({
      id: `pi_demo_${params.requestId}`,
      clientSecret: null,
      authExpiresAt,
    });
  }

  const intent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: "eur",
    capture_method: "manual",
    receipt_email: params.clientEmail,
    metadata: {
      requestId: params.requestId,
      strategy: "AUTH_HOLD" satisfies EscrowStrategy,
    },
    automatic_payment_methods: { enabled: true },
    ...(params.connectedAccountId
      ? {
          application_fee_amount: params.commissionAmount,
          transfer_data: { destination: params.connectedAccountId },
        }
      : {}),
  });

  return {
    demo: false as const,
    id: intent.id,
    clientSecret: intent.client_secret,
    authExpiresAt,
  };
}

/** Called when the client confirms the job. Money actually moves here. */
export async function captureHold(intentId: string) {
  if (!stripe) return demo({ chargeId: `ch_demo_${intentId}` });
  const intent = await stripe.paymentIntents.capture(intentId);
  return {
    demo: false as const,
    chargeId: (intent.latest_charge as string) ?? null,
  };
}

/** Job abandoned, or the hold is about to lapse — let the client go. */
export async function cancelHold(intentId: string) {
  if (!stripe) return demo({});
  await stripe.paymentIntents.cancel(intentId);
  return { demo: false as const };
}

/* ------------------------------ strategy 2: destination charge + lock */

export async function createDestinationCharge(params: {
  amount: number;
  requestId: string;
  clientEmail: string;
  connectedAccountId: string;
  commissionAmount: number;
}) {
  const releaseDeadline = ledgerDeadlineFrom();

  if (!stripe) {
    return demo({
      id: `pi_demo_dc_${params.requestId}`,
      clientSecret: null,
      releaseDeadline,
    });
  }

  const intent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: "eur",
    capture_method: "automatic", // charge straight away
    receipt_email: params.clientEmail,
    // the money lands in the professional's ledger, minus our fee
    transfer_data: { destination: params.connectedAccountId },
    application_fee_amount: params.commissionAmount,
    on_behalf_of: params.connectedAccountId,
    metadata: {
      requestId: params.requestId,
      strategy: "DESTINATION_CHARGE" satisfies EscrowStrategy,
    },
    automatic_payment_methods: { enabled: true },
  });

  return {
    demo: false as const,
    id: intent.id,
    clientSecret: intent.client_secret,
    releaseDeadline,
  };
}

/**
 * Unlocks the ledger. Because the account is on a manual schedule, nothing
 * reaches the professional's bank until this runs.
 */
export async function releasePayout(params: {
  connectedAccountId: string;
  amount: number;
  requestId: string;
}) {
  if (!stripe) return demo({ payoutId: `po_demo_${params.requestId}` });

  const payout = await stripe.payouts.create(
    {
      amount: params.amount,
      currency: "eur",
      metadata: { requestId: params.requestId },
    },
    { stripeAccount: params.connectedAccountId }
  );

  return { demo: false as const, payoutId: payout.id };
}

/** Dispute resolved for the client, or the ledger deadline is closing in. */
export async function refundCharge(intentId: string, reason?: string) {
  if (!stripe) return demo({});
  await stripe.refunds.create({
    payment_intent: intentId,
    reverse_transfer: true,
    refund_application_fee: true,
    ...(reason ? { metadata: { reason } } : {}),
  });
  return { demo: false as const };
}
