import "server-only";
import { serializable } from "./transaction";
import { notify } from "./notifications";
export async function expireOffers(now = new Date()) {
  return serializable(async tx => {
    const quotes = await tx.quote.findMany({ where: { state: "SENT", expiresAt: { lte: now }, request: { OR: [
      { state: "QUOTED", acceptedQuoteId: null }, { state: "BOOKED", acceptedQuoteId: { not: null } },
    ] } },
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
