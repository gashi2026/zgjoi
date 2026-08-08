import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { cancelHold } from "@/lib/server/stripe";
import { LEDGER_WARNING_DAYS, MAX_LEDGER_DAYS } from "@/lib/escrow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Runs every hour (see vercel.json). Both escrow strategies have a hard
 * expiry, and money that quietly lapses is the worst possible failure —
 * the client thinks they have paid and the professional never gets it.
 *
 * AUTH_HOLD           lapses after 7 days  -> warn, then cancel cleanly
 * DESTINATION_CHARGE  must clear in 90 days -> warn, then force a decision
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 36 * 36e5); // 36 hours out
  const actions = { warnedAuth: 0, expiredAuth: 0, warnedLedger: 0, urgentLedger: 0 };

  /* ---------- 1. authorisations about to lapse ---------- */

  const expiringHolds = await db.payment.findMany({
    where: {
      strategy: "AUTH_HOLD",
      state: { in: ["PENDING", "AUTHORISED"] },
      authExpiresAt: { lte: soon, gt: now },
      expiryWarnedAt: null,
    },
    include: { request: { select: { id: true, clientId: true, acceptedProfileId: true } } },
  });

  for (const p of expiringHolds) {
    await db.$transaction([
      db.payment.update({ where: { id: p.id }, data: { expiryWarnedAt: now } }),
      db.auditLog.create({
        data: {
          action: "ESCROW_AUTH_EXPIRING",
          target: p.requestId,
          meta: { expiresAt: p.authExpiresAt },
        },
      }),
    ]);
    await notify(p.request.clientId, p.request.acceptedProfileId, {
      subject: "Rezervimi i pagesës skadon së shpejti",
      body:
        "Rezervimi në kartë skadon brenda 36 orësh. Nëse puna ka përfunduar, " +
        "konfirmoje në aplikacion që pagesa të kalojë te profesionisti.",
    });
    actions.warnedAuth++;
  }

  /* ---------- 2. authorisations that already lapsed ---------- */

  const lapsed = await db.payment.findMany({
    where: {
      strategy: "AUTH_HOLD",
      state: { in: ["PENDING", "AUTHORISED"] },
      authExpiresAt: { lte: now },
    },
  });

  for (const p of lapsed) {
    if (p.stripePaymentIntentId) {
      try {
        await cancelHold(p.stripePaymentIntentId);
      } catch {
        /* Stripe may have released it already — the state change still applies */
      }
    }
    await db.$transaction([
      db.payment.update({ where: { id: p.id }, data: { state: "EXPIRED" } }),
      db.auditLog.create({ data: { action: "ESCROW_AUTH_EXPIRED", target: p.requestId } }),
    ]);
    actions.expiredAuth++;
  }

  /* ---------- 3. ledger funds approaching the 90-day limit ---------- */

  const warnAt = new Date(now.getTime() - LEDGER_WARNING_DAYS * 864e5);

  const ageing = await db.payment.findMany({
    where: {
      strategy: "DESTINATION_CHARGE",
      state: "HELD",
      heldAt: { lte: warnAt },
      expiryWarnedAt: null,
    },
    include: { request: { select: { id: true, clientId: true, acceptedProfileId: true } } },
  });

  for (const p of ageing) {
    await db.$transaction([
      db.payment.update({ where: { id: p.id }, data: { expiryWarnedAt: now } }),
      db.auditLog.create({
        data: {
          action: "ESCROW_LEDGER_AGEING",
          target: p.requestId,
          meta: { heldAt: p.heldAt, deadline: p.releaseDeadline },
        },
      }),
    ]);
    await notify(p.request.clientId, p.request.acceptedProfileId, {
      subject: "Kjo punë duhet mbyllur",
      body:
        `Pagesa është e bllokuar prej më shumë se ${LEDGER_WARNING_DAYS} ditësh. ` +
        `Sipas rregullave, ajo duhet liruar ose rimbursuar brenda ${MAX_LEDGER_DAYS} ditësh. ` +
        "Konfirmo përfundimin ose hap një kontest.",
    });
    actions.warnedLedger++;
  }

  /* ---------- 4. past the point where admin must act ---------- */

  const urgent = await db.payment.count({
    where: {
      strategy: "DESTINATION_CHARGE",
      state: "HELD",
      releaseDeadline: { lte: new Date(now.getTime() + 7 * 864e5) },
    },
  });
  actions.urgentLedger = urgent;

  return NextResponse.json({ ok: true, ranAt: now.toISOString(), actions });
}

/**
 * Notification hook. Wire this to Resend/Postmark when email is ready —
 * for now it writes a row so nothing is lost.
 */
async function notify(
  clientId: string,
  profileId: string | null,
  msg: { subject: string; body: string }
) {
  await db.auditLog.create({
    data: {
      action: "NOTIFY",
      target: clientId,
      meta: { profileId, ...msg },
    },
  });
}
