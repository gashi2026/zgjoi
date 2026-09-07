import { z } from "zod";
import { email, password } from "./validation";

export const entityId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const clientKey = z.string().uuid();
export const cleanText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);
export const euroAmount = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (value) => /^\d{1,6}([.,]\d{1,2})?$/.test(value),
    "Shkruani një çmim me deri dy shifra pas presjes.",
  )
  .transform((value) => {
    const [euros, cents = ""] = value.replace(",", ".").split(".");
    return Number(euros) * 100 + Number(cents.padEnd(2, "0"));
  })
  .refine(
    (value) => Number.isSafeInteger(value) && value >= 1 && value <= 10_000_000,
    "Çmimi është jashtë kufirit të lejuar.",
  );

export const signupInput = z
  .object({
    role: z.enum(["CLIENT", "PRO"]),
    name: cleanText(2, 120),
    email,
    password,
    city: cleanText(1, 60),
    phone: z.string().trim().max(30).optional(),
    categorySlug: cleanText(1, 80).optional(),
    about: cleanText(30, 4000).optional(),
    priceFrom: euroAmount.optional(),
    experience: cleanText(1, 80).optional(),
    terms: z.literal(true, {
      errorMap: () => ({ message: "Pranoni kushtet për të vazhduar." }),
    }),
  })
  .superRefine((value, ctx) => {
    if (value.role === "PRO")
      for (const key of ["categorySlug", "about", "priceFrom"] as const) {
        if (!value[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Plotësoni këtë fushë.",
          });
      }
  });

export const inquiryInput = z.object({
  profileId: entityId,
  title: cleanText(5, 120),
  detail: cleanText(20, 4000),
  city: cleanText(1, 60),
  timing: cleanText(2, 120),
  address: z.string().trim().max(200).optional(),
  clientKey,
});
export const offerInput = z.object({
  requestId: entityId,
  clientKey,
  expectedVersion: z.number().int().nonnegative(),
  amount: euroAmount,
  description: cleanText(20, 4000),
  timing: cleanText(3, 120),
  scheduledAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  duration: cleanText(1, 60),
});
export const acceptanceInput = z.object({
  quoteId: entityId,
  expectedVersion: z.number().int().nonnegative(),
});
export const chatInput = z.object({
  conversationId: entityId,
  body: cleanText(1, 2000),
  clientKey,
});
export const supportInput = z.object({
  ticketId: entityId.nullish().transform((v) => v ?? undefined),
  body: cleanText(1, 2000),
  guestName: cleanText(1, 120).optional(),
  guestEmail: email.optional().or(z.literal("")),
  clientKey: clientKey.optional(),
});
export const reviewInput = z.object({
  requestId: entityId,
  rating: z.number().int().min(1).max(5),
  text: cleanText(15, 2000),
  tags: z.array(cleanText(1, 40)).max(10).default([]),
});
export const profileInput = z.object({
  name: cleanText(2, 120),
  city: cleanText(1, 60),
  phone: z.string().trim().max(30),
  about: cleanText(30, 4000).optional(),
  categorySlug: cleanText(1, 80).optional(),
  priceFrom: euroAmount.optional(),
  experience: z.string().trim().max(80).optional(),
  serviceCities: z.array(cleanText(1, 60)).min(1).max(20).optional(),
});
export const availabilityInput = z
  .object({
    days: z
      .array(
        z
          .object({
            weekday: z.number().int().min(0).max(6),
            startMin: z.number().int().min(0).max(1439),
            endMin: z.number().int().min(1).max(1440),
          })
          .refine(
            (v) => v.endMin > v.startMin,
            "Ora e përfundimit duhet të jetë më vonë.",
          ),
      )
      .max(7),
  })
  .refine(
    (v) => new Set(v.days.map((d) => d.weekday)).size === v.days.length,
    "Dita është përsëritur.",
  );
