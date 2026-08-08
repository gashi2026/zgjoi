import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/server/db";
import { stripe, stripeEnabled } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe tells us here when a payment actually succeeded. Never trust the
 * browser for this — the client can close the tab mid-payment.
 *
 * Set the endpoint in the Stripe dashboard to:
 *   https://<your-domain>/api/stripe/webhook
 */
export async function POST(req: Request) {
  if (!stripeEnabled || !stripe) {
    return NextResponse.json({ ok: true, skipped: "stripe not configured" });
  }

  const signature = headers().get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const intent = event.data.object as any;
  const requestId = intent?.metadata?.requestId;

  switch (event.type) {
    /* AUTH_HOLD: the card was authorised — money frozen, not taken yet. */
    case "payment_intent.amount_capturable_updated": {
      if (requestId) {
        await db.payment.updateMany({
          where: { requestId },
          data: {
            state: "AUTHORISED",
            authorisedAt: new Date(),
            stripePaymentIntentId: intent.id,
          },
        });
        await db.serviceRequest.updateMany({
          where: { id: requestId, state: "BOOKED" },
          data: { state: "IN_PROGRESS" },
        });
      }
      break;
    }

    /* DESTINATION_CHARGE: money actually taken and parked in the
       professional's locked ledger. Also fires when we capture a hold. */
    case "payment_intent.succeeded": {
      if (requestId) {
        await db.payment.updateMany({
          where: { requestId, state: { not: "RELEASED" } },
          data: {
            state: "HELD",
            heldAt: new Date(),
            stripePaymentIntentId: intent.id,
            stripeChargeId: intent.latest_charge ?? null,
          },
        });
        await db.serviceRequest.updateMany({
          where: { id: requestId, state: "BOOKED" },
          data: { state: "IN_PROGRESS" },
        });
      }
      break;
    }

    /* The hold lapsed or was cancelled before capture. */
    case "payment_intent.canceled": {
      if (requestId) {
        await db.payment.updateMany({
          where: { requestId },
          data: { state: "EXPIRED" },
        });
      }
      break;
    }

    /* The connected account finished onboarding. */
    case "account.updated": {
      const acct = event.data.object as any;
      await db.proProfile.updateMany({
        where: { stripeAccountId: acct.id },
        data: {
          stripeOnboarded: Boolean(acct.details_submitted && acct.charges_enabled),
          stripePayoutsManual: acct.settings?.payouts?.schedule?.interval === "manual",
        },
      });
      break;
    }
    case "charge.refunded": {
      if (requestId) {
        await db.payment.updateMany({
          where: { requestId },
          data: { state: "REFUNDED", refundedAt: new Date() },
        });
      }
      break;
    }
  }

  await db.auditLog.create({
    data: { action: `STRIPE_${event.type}`, target: requestId ?? intent?.id ?? "unknown" },
  });

  return NextResponse.json({ received: true });
}
