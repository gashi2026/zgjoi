import { json, readBody } from "@/lib/server/http";
import { paymentProvider, applyCheckoutEvent } from "@/lib/server/payments";
import { AppError } from "@/lib/server/errors";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET,
    signature = req.headers.get("stripe-signature");
  if (!secret || !signature)
    return json({ error: "Webhook not configured or signature missing" }, 400);
  if (Number(req.headers.get("content-length") || 0) > 65536)
    return json({ error: "Too large" }, 413);
  try {
    const raw = await readBody(req, 65536);
    if (Buffer.byteLength(raw) > 65536)
      return json({ error: "Too large" }, 413);
    const stripe = paymentProvider();
    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, signature, secret);
    } catch {
      return json({ error: "Invalid signature" }, 400);
    }
    return json(await applyCheckoutEvent(event));
  } catch (error) {
    return json(
      { error: error instanceof AppError ? error.code : "WEBHOOK_RETRY" },
      error instanceof AppError ? error.status : 503,
    );
  }
}
