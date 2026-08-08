import { z } from "zod";

/* Shared between client forms and server actions, so the rules can never
   drift apart. Messages are in Albanian — they are shown to users. */

export const personalNo = z
  .string()
  .regex(/^\d{10}$/, "Numri personal duhet të ketë saktësisht 10 shifra.");

export const email = z
  .string()
  .email("Shkruani një adresë email të vlefshme.")
  .toLowerCase()
  .trim();

export const password = z
  .string()
  .min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere.");

export const phone = z
  .string()
  .min(8, "Shkruani një numër telefoni të vlefshëm.")
  .max(20);

export const clientSignupSchema = z.object({
  name: z.string().min(2, "Shkruani emrin tuaj të plotë.").max(120),
  personalNo,
  email,
  password,
  city: z.string().max(60).optional(),
});

export const proSignupSchema = z.object({
  name: z.string().min(3, "Shkruaj emrin dhe mbiemrin.").max(120),
  personalNo,
  email,
  phone,
  password,
  categorySlug: z.string().min(1, "Zgjidh një kategori."),
  city: z.string().min(1, "Zgjidh qytetin ku punon."),
  experience: z.string().min(1, "Zgjidh vitet e përvojës."),
  about: z.string().min(30, "Përshkrimi duhet të ketë të paktën 30 karaktere."),
  priceFrom: z.coerce.number().int().positive("Shkruaj një çmim fillestar."),
  iban: z.string().min(10, "Shkruaj numrin e llogarisë bankare.").max(34),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Duhet t'i pranosh kushtet për të vazhduar." }),
  }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Shkruani fjalëkalimin."),
});

export const requestSchema = z.object({
  categorySlug: z.string().min(1, "Zgjidh një kategori shërbimi."),
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  city: z.string().min(1, "Zgjidh qytetin."),
  timing: z.string().min(1, "Zgjidh kur ju nevojitet shërbimi."),
  budgetBand: z.string().optional(),
  detail: z.string().max(2000).optional(),
  address: z.string().max(200).optional(),
});

export const quoteSchema = z.object({
  requestId: z.string().min(1),
  lines: z
    .array(
      z.object({
        label: z.string().min(1),
        qty: z.coerce.number().int().positive(),
        price: z.coerce.number().int().nonnegative(),
      })
    )
    .min(1, "Shto të paktën një zë me çmim."),
  message: z.string().min(20, "Shkruaj një mesazh më të plotë për klientin."),
  availableAt: z.string().max(120).optional(),
  duration: z.string().max(60).optional(),
  warranty: z.string().max(160).optional(),
  /* Working days. Decides the escrow strategy, so it is required. */
  expectedDays: z.coerce
    .number()
    .int()
    .min(1, "Sa ditë pune të duhen?")
    .max(90, "Për punë mbi 90 ditë, ndaje projektin në faza."),
});

export const reviewSchema = z.object({
  requestId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Zgjidh një vlerësim me yje.").max(5),
  text: z.string().min(15, "Shkruaj të paktën 15 karaktere."),
  tags: z.array(z.string()).max(10).default([]),
});

export const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export const supportMessageSchema = z.object({
  ticketId: z.string().optional(),
  body: z.string().min(1, "Shkruaj një mesazh.").max(2000),
  guestName: z.string().max(120).optional(),
  guestEmail: z.string().email().optional().or(z.literal("")),
});

export const leadBudgetSchema = z.object({
  weeklyBudget: z.coerce.number().int().min(1000).max(50000),
  radiusKm: z.coerce.number().int().min(5).max(100),
  autoBid: z.boolean(),
  serviceCities: z.array(z.string()).min(1, "Zgjidh të paktën një qytet."),
});
