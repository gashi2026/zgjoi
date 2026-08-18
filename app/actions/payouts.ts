"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireRole } from "@/lib/server/auth";

/* Manual bank escrow (TEB). The money never touches a card processor:
   1. client transfers to the Zgjoi account   -> Payment.PENDING
   2. admin sees it on the statement, confirms -> Payment.HELD
   3. client confirms the job is finished      -> Payout row appears here
   4. admin transfers the pro's share          -> Payout.PAID + Payment.RELEASED
   The 15% commission simply stays in the Zgjoi account. */

/** Step 2 — the client's transfer has landed in the TEB account. */
export async function confirmFundsReceived(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id) return;

  await db.payment.update({
    where: { id },
    data: { state: "HELD", heldAt: new Date() },
  });
  revalidatePath("/admin/pagesat");
  revalidatePath("/admin/transaksionet");
}

/** Step 4 — the professional's share has been transferred out. */
export async function markPaidOut(formData: FormData) {
  await requireRole("ADMIN");
  const paymentId = String(formData.get("paymentId"));
  const reference = String(formData.get("reference") ?? "").trim();
  if (!paymentId) return;

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { request: { select: { acceptedProfileId: true } } },
  });
  if (!payment) return;

  const profileId = payment.request.acceptedProfileId;
  if (!profileId) return;

  await db.$transaction([
    db.payment.update({
      where: { id: paymentId },
      data: { state: "RELEASED", releasedAt: new Date() },
    }),
    db.payout.create({
      data: {
        profileId,
        paymentId,
        amount: payment.proAmount,
        state: "PAID",
        reference: reference || null,
        scheduledFor: new Date(),
        paidAt: new Date(),
      },
    }),
  ]);

  revalidatePath("/admin/pagesat");
  revalidatePath("/admin/transaksionet");
  revalidatePath("/admin");
}

/** Money returned to the client (job cancelled, dispute upheld). */
export async function refundPayment(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id) return;
  await db.payment.update({
    where: { id },
    data: { state: "REFUNDED", refundedAt: new Date() },
  });
  revalidatePath("/admin/pagesat");
  revalidatePath("/admin/transaksionet");
}
