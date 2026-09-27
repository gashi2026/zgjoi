import "server-only";
import { z } from "zod";
import type { Actor } from "./auth";
import { serializable, isParticipant } from "./marketplace";
import { invariant } from "./errors";
import { notify } from "./notifications";
import { entityId, cleanText } from "../marketplace-validation";

export async function openDispute(actor: Actor, input: unknown) {
  const data = z
    .object({ requestId: entityId, reason: cleanText(20, 4000) })
    .parse(input);
  return serializable(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id: data.requestId },
      include: {
        payment: { include: { dispute: true } },
        selectedPro: { select: { userId: true } },
      },
    });
    invariant(
      request && isParticipant(request, actor),
      "NOT_FOUND",
      404,
      "Kërkesa nuk u gjet.",
    );
    if (request.payment?.dispute)
      return { ok: true, id: request.payment.dispute.id };
    invariant(
      request.payment?.state === "HELD" && !request.payment.operation,
      "STATE",
      409,
      "Për këtë pagesë kontaktoni mbështetjen për shqyrtim.",
    );
    const dispute = await tx.dispute.create({
      data: {
        paymentId: request.payment.id,
        openedById: actor.id,
        reason: data.reason,
      },
    });
    await tx.payment.update({
      where: { id: request.payment.id },
      data: { state: "DISPUTED" },
    });
    await tx.serviceRequest.update({
      where: { id: request.id },
      data: { state: "DISPUTED", version: { increment: 1 } },
    });
    const admins = await tx.user.findMany({
      where: { role: "ADMIN", suspendedAt: null },
      select: { id: true },
    });
    for (const admin of admins)
      await notify(
        tx,
        admin.id,
        "DISPUTE",
        "Një kontest kërkon shqyrtim",
        "/admin/pagesat",
      );
    await tx.auditLog.create({
      data: { actorId: actor.id, action: "DISPUTE_OPENED", target: request.id },
    });
    return { ok: true, id: dispute.id };
  });
}
