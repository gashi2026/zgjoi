import "server-only";
import { serializable } from "./transaction";
import { notify } from "./notifications";
export async function expireOffers(now = new Date()) {
  return serializable(async tx => {
    const quotes = await tx.quote.findMany({ where: { state: "SENT", expiresAt: { lte: now }, request: { state: "QUOTED", acceptedQuoteId: null } },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }], take: 100,
      include: { request: { select: { clientId: true } }, profile: { select: { userId: true } } } });
    let expired = 0;
    for (const quote of quotes) {
      const changed = await tx.quote.updateMany({ where: { id: quote.id, state: "SENT", expiresAt: { lte: now } }, data: { state: "EXPIRED" } });
      if (!changed.count) continue;
      const reopened = await tx.serviceRequest.updateMany({ where: { id: quote.requestId, state: "QUOTED", acceptedQuoteId: null }, data: { state: "OPEN", version: { increment: 1 } } });
      if (reopened.count) {
        await notify(tx, quote.request.clientId, "EXPIRED", "Oferta skadoi; kërkoni ofertë të re", `/llogaria/kerkesat/${quote.requestId}`);
        await notify(tx, quote.profile.userId, "EXPIRED", "Oferta juaj skadoi pa u pranuar", `/pro/kerkesat/${quote.requestId}`);
      }
      expired++;
    }
    return expired;
  });
}
