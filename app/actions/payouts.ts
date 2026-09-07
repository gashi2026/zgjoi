"use server";
import { requireRole } from "@/lib/server/auth";
import { releasePayment, refundHeldPayment } from "@/lib/server/payments";
import { AppError } from "@/lib/server/errors";
import { revalidatePath } from "next/cache";
export async function confirmFundsReceived(_formData: FormData) {
  await requireRole("ADMIN");
  throw new AppError(
    "DISABLED",
    409,
    "Pagesa duhet të konfirmohet nga ofruesi. Nuk mund të shënohet manualisht si e paguar.",
  );
}
export async function markPaidOut(formData: FormData) {
  await releasePayment(
    await requireRole("ADMIN"),
    String(formData.get("paymentId") || ""),
  );
  revalidatePath("/admin/pagesat");
}
export async function refundPayment(formData: FormData) {
  await refundHeldPayment(
    await requireRole("ADMIN"),
    String(formData.get("id") || ""),
    String(formData.get("reason") || ""),
  );
  revalidatePath("/admin/pagesat");
}
