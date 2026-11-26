import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { serializable } from "./transaction";
import { notify } from "./notifications";

/**
 * Expires SENT offers whose acceptance deadline has passed. Called by the
 * maintenance cron for everything, and lazily (scoped) whenever a request or a
 * dashboard is read, so Preview/beta does not depend on cron running.
 */
export async function expireOffers(now = new Date(), scope?: Prisma.ServiceRequestWhereInput) {
  return serializable(async tx => {
    const eligible: Prisma.ServiceRequestWhereInput = { OR: [
      { state: "QUOTED", acceptedQuoteId: null }, { state: "BOOKED", acceptedQuoteId: { not: null } },
    ] };
    const quotes = await tx.quote.findMany({ where: { state: "SENT", expiresAt: { lte: now },
      request: scope ? { AND: [scope, eligible] } : eligible },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }], take: 100,
      include: { request: { select: { clientId: true, state: true, acceptedQuoteId: true } }, profile: { select: { userId: true } } } });
    let expired = 0;
    for (const quote of quotes) {
      const changed = await tx.quote.updateMany({ where: { id: quote.id, state: "SENT", expiresAt: { lte: now } }, data: { state: "EXPIRED" } });
      if (!changed.count) continue;
      const reschedule = quote.request.state === "BOOKED";
      const reopened = await tx.serviceRequest.updateMany({ where: { id: quote.requestId, state: quote.request.state, acceptedQuoteId: quote.request.acceptedQuoteId },
        data: { ...(reschedule ? {} : { state: "OPEN" }), version: { increment: 1 } } });
      if (reopened.count) {
        const kind = reschedule ? "RESCHEDULE_EXPIRED" : "EXPIRED";
        await notify(tx, quote.request.clientId, kind, reschedule ? "Propozimi skadoi; orari i mëparshëm mbetet" : "Oferta skadoi; kërkoni ofertë të re", `/llogaria/kerkesat/${quote.requestId}`);
        await notify(tx, quote.profile.userId, kind, reschedule ? "Propozimi skadoi; orari i mëparshëm mbetet" : "Oferta juaj skadoi pa u pranuar", `/pro/kerkesat/${quote.requestId}`);
      }
      expired++;
    }
    return expired;
  });
}

/**
 * Read-path expiry: a cheap check first, the serializable write only when an
 * offer is actually overdue. Never fails the page; the cron remains a backstop.
 */
export async function expireDueOffersFor(scope: Prisma.ServiceRequestWhereInput, now = new Date()) {
  try {
    const due = await db.quote.count({ where: { state: "SENT", expiresAt: { lte: now }, request: scope } });
    return due ? await expireOffers(now, scope) : 0;
  } catch (error) {
    console.error(JSON.stringify({ event: "lazy_offer_expiry_failed", type: error instanceof Error ? error.name : "Unknown" }));
    return 0;
  }
}
