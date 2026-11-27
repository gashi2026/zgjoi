import { z } from "zod";
import "./zod-sq";
import { email, password } from "./validation";
import { appointmentMinutes } from "./appointments";
import { municipalityName, municipalityNames } from "./kosovo-municipalities";

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

/** Sign-up (step 1 for customers; steps 1–2 for pros). No prices here: pros set them later in
 * their profile panel. Pros pick one or more professions (`categories`; `categorySlug` is still
 * accepted as a single choice from older clients). */
export const signupInput = z
  .object({
    role: z.enum(["CLIENT", "PRO"]),
    name: cleanText(2, 120),
    email,
    password,
    city: municipalityName,
    phone: z.string().trim().max(30).optional(),
    categories: z.array(cleanText(1, 80)).max(20).optional(),
    categorySlug: cleanText(1, 80).optional(),
    about: cleanText(30, 4000).optional(),
    experience: cleanText(1, 80).optional(),
    terms: z.literal(true, {
      error: "Pranoni kushtet për të vazhduar.",
    }),
  })
  .transform(({ categorySlug, ...value }) => ({
    ...value,
    categories: [...(value.categories ?? []), ...(categorySlug ? [categorySlug] : [])],
  }))
  .superRefine((value, ctx) => {
    if (value.role !== "PRO") return;
    if (!value.categories.length)
      ctx.addIssue({ code: "custom", path: ["categories"], message: "Zgjidhni të paktën një profesion." });
    if (!value.about)
      ctx.addIssue({ code: "custom", path: ["about"], message: "Plotësoni këtë fushë." });
  });

/** Chat-then-hire: the customer's first chat message is the job description.
 * A short title is derived from it when the form does not send one. */
export const DEFAULT_CHAT_TIMING = "Sipas marrëveshjes në bisedë";
export function chatTitle(detail: string) {
  const line = detail.replace(/\s+/g, " ").trim();
  if (line.length <= 80) return line;
  const cut = line.slice(0, 80);
  const space = cut.lastIndexOf(" ");
  return `${(space >= 40 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
export const inquiryInput = z
  .object({
    profileId: entityId,
    /** Which of the pro's professions the chat is about (defaults to their main one). */
    categorySlug: cleanText(1, 80).optional(),
    title: cleanText(5, 120).optional(),
    detail: cleanText(20, 4000),
    city: municipalityName,
    timing: z.string().trim().max(120).optional(),
    address: z.string().trim().max(200).optional(),
    clientKey,
  })
  .transform((value) => ({
    ...value,
    title: value.title ?? chatTitle(value.detail),
    timing: value.timing || DEFAULT_CHAT_TIMING,
  }));
/** Quote expiry choices shown on the in-chat quote card (hours). */
export const offerExpiryHours = [24, 72, 168] as const;
export const offerInput = z
  .object({
    requestId: entityId,
    clientKey,
    expectedVersion: z.number().int().nonnegative(),
    amount: euroAmount,
    /** Optional note on the quote card. */
    description: z.string().trim().max(4000).optional().default(""),
    timing: z.string().trim().max(120).optional().default(""),
    /** Optional start date; when given, the duration is required so the slot can be reserved. */
    scheduledAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    expiresInHours: z.coerce
      .number()
      .refine((value) => (offerExpiryHours as readonly number[]).includes(value), "Zgjidhni një nga afatet e lejuara.")
      .optional(),
    duration: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((value) => value || undefined)
      .refine(value => value === undefined || appointmentMinutes(value) !== null, "Shkruani kohëzgjatjen në minuta, nga 1 deri 43200.")
      .transform(value => (value === undefined ? undefined : `${appointmentMinutes(value)} min`)),
  })
  .superRefine((value, ctx) => {
    if (!value.expiresAt && value.expiresInHours === undefined)
      ctx.addIssue({ code: "custom", path: ["expiresInHours"], message: "Zgjidhni sa kohë vlen oferta." });
    if (value.scheduledAt && !value.duration)
      ctx.addIssue({ code: "custom", path: ["duration"], message: "Shkruani kohëzgjatjen në minuta kur caktoni datën e punës." });
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
  city: municipalityName,
  phone: z.string().trim().max(30),
  about: cleanText(30, 4000).optional(),
  experience: z.string().trim().max(80).optional(),
  serviceCities: municipalityNames.optional(),
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
