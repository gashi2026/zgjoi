"use server";
import { requireUser } from "@/lib/server/auth";
import {
  createInquiry,
  createOffer,
  acceptOffer,
  publishReview,
} from "@/lib/server/marketplace";
import { AppError } from "@/lib/server/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./auth";
export async function createRequest(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await createInquiry(
    await requireUser(),
    Object.fromEntries(formData),
  );
  redirect(result.redirect);
}
export async function openLead(_requestId: string) {
  await requireUser();
  throw new AppError(
    "DISABLED",
    410,
    "Kërkesat janë private dhe nuk kanë pagesë për hapje.",
  );
}
export async function sendQuote(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await createOffer(await requireUser(), {
    ...Object.fromEntries(formData),
    expectedVersion: Number(formData.get("expectedVersion")),
  });
  revalidatePath("/pro/kerkesat");
  return { ok: true };
}
export async function acceptQuote(quoteId: string, expectedVersion?: number) {
  const result = await acceptOffer(await requireUser(), {
    quoteId,
    expectedVersion,
  });
  redirect(result.redirect);
}
export async function submitReview(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await publishReview(await requireUser(), {
    ...Object.fromEntries(formData),
    rating: Number(formData.get("rating")),
    tags: formData.getAll("tags").map(String),
  });
  revalidatePath("/llogaria");
  return { ok: true, message: "Faleminderit për vlerësimin." };
}
