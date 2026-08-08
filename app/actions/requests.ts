"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser, requirePro } from "@/lib/server/auth";
import { leadCostCents } from "@/lib/server/settings";
import { beginEscrow, releaseEscrow } from "./payments";
import { quoteSchema, requestSchema, reviewSchema } from "@/lib/validation";
import type { ActionState } from "./auth";

const fieldErrors = (e: any): Record<string, string> =>
  Object.fromEntries(
    Object.entries(e.flatten().fieldErrors).map(([k, v]) => [k, (v as string[])[0]])
  );

/* -------------------------------------------------- client: publish job */

export async function createRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const payload = {
    categorySlug: String(formData.get("categorySlug") ?? ""),
    answers: JSON.parse(String(formData.get("answers") ?? "{}")),
    city: String(formData.get("city") ?? ""),
    timing: String(formData.get("timing") ?? ""),
    budgetBand: String(formData.get("budgetBand") ?? "") || undefined,
    detail: String(formData.get("detail") ?? "") || undefined,
    address: String(formData.get("address") ?? "") || undefined,
  };

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const category = await db.category.findUnique({ where: { slug: parsed.data.categorySlug } });

  const request = await db.serviceRequest.create({
    data: {
      clientId: user.id,
      categorySlug: parsed.data.categorySlug,
      title: category?.name ?? parsed.data.categorySlug,
      answers: parsed.data.answers,
      city: parsed.data.city,
      timing: parsed.data.timing,
      budgetBand: parsed.data.budgetBand,
      detail: parsed.data.detail,
      address: parsed.data.address,
      state: "OPEN",
      conversation: { create: {} },
    },
  });

  revalidatePath("/llogaria");
  redirect(`/llogaria/kerkesat/${request.id}`);
}

/* ------------------------------------------------------ pro: open lead */

export async function openLead(requestId: string) {
  const { profile } = await requirePro();

  const existing = await db.leadCharge.findUnique({
    where: { profileId_requestId: { profileId: profile.id, requestId } },
  });
  if (existing) return { ok: true };

  const full = await db.proProfile.findUniqueOrThrow({ where: { id: profile.id } });
  const cost = await leadCostCents();

  if (full.weeklySpent + cost > full.weeklyBudget) {
    return { ok: false, message: "Buxheti javor ka mbaruar. Rrite buxhetin ose prit të hënën." };
  }

  await db.$transaction([
    db.leadCharge.create({ data: { profileId: profile.id, requestId, amount: cost } }),
    db.proProfile.update({
      where: { id: profile.id },
      data: { weeklySpent: { increment: cost } },
    }),
  ]);

  revalidatePath("/pro/kerkesat");
  return { ok: true };
}

/* ----------------------------------------------------- pro: send quote */

export async function sendQuote(_: ActionState, formData: FormData): Promise<ActionState> {
  const { profile } = await requirePro();

  const parsed = quoteSchema.safeParse({
    requestId: formData.get("requestId"),
    lines: JSON.parse(String(formData.get("lines") ?? "[]")),
    message: formData.get("message"),
    availableAt: formData.get("availableAt") || undefined,
    duration: formData.get("duration") || undefined,
    warranty: formData.get("warranty") || undefined,
    expectedDays: formData.get("expectedDays") ?? 1,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const amount = parsed.data.lines.reduce((s, l) => s + l.qty * l.price, 0) * 100;
  if (amount <= 0) return { ok: false, errors: { lines: "Shto të paktën një zë me çmim." } };

  const request = await db.serviceRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request || request.state !== "OPEN" && request.state !== "QUOTED") {
    return { ok: false, message: "Kjo kërkesë nuk pranon më oferta." };
  }

  await db.$transaction([
    db.quote.upsert({
      where: { requestId_profileId: { requestId: request.id, profileId: profile.id } },
      create: {
        requestId: request.id,
        profileId: profile.id,
        amount,
        lines: parsed.data.lines,
        message: parsed.data.message,
        availableAt: parsed.data.availableAt,
        duration: parsed.data.duration,
        warranty: parsed.data.warranty,
        expectedDays: parsed.data.expectedDays,
      },
      update: {
        amount,
        lines: parsed.data.lines,
        message: parsed.data.message,
        expectedDays: parsed.data.expectedDays,
        state: "SENT",
      },
    }),
    db.serviceRequest.update({ where: { id: request.id }, data: { state: "QUOTED" } }),
  ]);

  revalidatePath("/pro/kerkesat");
  return { ok: true, message: "Oferta u dërgua." };
}

/* -------------------------------------------- client: accept a quote */

export async function acceptQuote(quoteId: string) {
  const user = await requireUser();

  const quote = await db.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { request: true },
  });
  if (quote.request.clientId !== user.id) throw new Error("FORBIDDEN");

  await db.$transaction([
    db.quote.update({ where: { id: quote.id }, data: { state: "ACCEPTED" } }),
    db.quote.updateMany({
      where: { requestId: quote.requestId, id: { not: quote.id } },
      data: { state: "DECLINED" },
    }),
    db.serviceRequest.update({
      where: { id: quote.requestId },
      data: { state: "BOOKED", acceptedProfileId: quote.profileId },
    }),
  ]);

  /* Creates the Payment row and the Stripe intent, choosing AUTH_HOLD or
     DESTINATION_CHARGE from the quoted duration. */
  const escrow = await beginEscrow(quote.id);
  if (!escrow.ok) return { ok: false, message: escrow.error };

  redirect(`/llogaria/pagesa?request=${quote.requestId}`);
}

/* ------------------------------- client: confirm completion + review */

export async function submitReview(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse({
    requestId: formData.get("requestId"),
    rating: formData.get("rating"),
    text: formData.get("text"),
    tags: formData.getAll("tags").map(String),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const request = await db.serviceRequest.findUniqueOrThrow({
    where: { id: parsed.data.requestId },
    include: { payment: true },
  });
  if (request.clientId !== user.id) throw new Error("FORBIDDEN");
  if (!request.acceptedProfileId) return { ok: false, message: "Kjo punë nuk ka profesionist të caktuar." };

  const code = `ZGJOI-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  await db.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        requestId: request.id,
        authorId: user.id,
        profileId: request.acceptedProfileId!,
        rating: parsed.data.rating,
        text: parsed.data.text,
        tags: parsed.data.tags,
      },
    });

    await tx.serviceRequest.update({ where: { id: request.id }, data: { state: "COMPLETED" } });

    // recompute the professional's rating
    const agg = await tx.review.aggregate({
      where: { profileId: request.acceptedProfileId!, state: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    });
    await tx.proProfile.update({
      where: { id: request.acceptedProfileId! },
      data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
    });

    // thank-you coupon
    await tx.coupon.create({
      data: {
        code,
        userId: user.id,
        percent: 10,
        expiresAt: new Date(Date.now() + 365 * 864e5),
      },
    });
  });

  /* Money moves here — capture the hold, or unlock the ledger payout. */
  const released = await releaseEscrow(request.id);

  revalidatePath("/llogaria");
  return {
    ok: true,
    message: code,
    ...(released.ok ? {} : { warning: released.error }),
  };
}
