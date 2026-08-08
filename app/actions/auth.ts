"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/server/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/server/auth";
import { encrypt, last4 } from "@/lib/server/crypto";
import { rateLimit } from "@/lib/server/rate-limit";
import { clientSignupSchema, loginSchema, proSignupSchema } from "@/lib/validation";

export type ActionState = { ok: boolean; errors?: Record<string, string>; message?: string };

const fieldErrors = (e: any): Record<string, string> =>
  Object.fromEntries(
    Object.entries(e.flatten().fieldErrors).map(([k, v]) => [k, (v as string[])[0]])
  );

function slugify(name: string, suffix: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    suffix
  );
}

/* ------------------------------------------------------------- signup */

export async function registerClient(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = clientSignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { name, personalNo, email, password, city } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { ok: false, errors: { email: "Ky email është i regjistruar tashmë." } };
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      city,
      passwordHash: await hashPassword(password),
      personalNoEnc: encrypt(personalNo),
      personalNoLast4: last4(personalNo),
      role: "CLIENT",
    },
  });

  await createSession(user.id);
  redirect("/llogaria");
}

export async function registerPro(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = proSignupSchema.safeParse({ ...raw, terms: raw.terms === "on" || raw.terms === "true" });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) {
    return { ok: false, errors: { email: "Ky email është i regjistruar tashmë." } };
  }

  const user = await db.user.create({
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone,
      city: d.city,
      passwordHash: await hashPassword(d.password),
      personalNoEnc: encrypt(d.personalNo),
      personalNoLast4: last4(d.personalNo),
      role: "PRO",
      proProfile: {
        create: {
          slug: slugify(d.name, Math.random().toString(36).slice(2, 7)),
          categorySlug: d.categorySlug,
          about: d.about,
          priceFrom: d.priceFrom * 100,
          experience: d.experience,
          serviceCities: [d.city],
          ibanEnc: encrypt(d.iban.replace(/\s/g, "")),
          ibanLast4: last4(d.iban.replace(/\s/g, "")),
          verification: "PENDING",
        },
      },
    },
  });

  await db.auditLog.create({
    data: { actorId: user.id, action: "PRO_SIGNUP", target: user.id },
  });

  await createSession(user.id);
  redirect("/pro/paneli?welcome=1");
}

/* -------------------------------------------------------------- login */

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const ip = headers().get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`login:${ip}`, 8, 15 * 60_000);
  if (!limit.ok) {
    return { ok: false, message: "Shumë përpjekje. Provoni sërish pas pak minutash." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Same message either way, so the form cannot be used to discover emails.
  const generic = { ok: false, message: "Email ose fjalëkalim i pasaktë." };
  if (!user) return generic;
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return generic;
  if (user.suspendedAt) return { ok: false, message: "Kjo llogari është pezulluar. Kontaktoni mbështetjen." };

  await createSession(user.id);
  redirect(user.role === "PRO" ? "/pro/paneli" : user.role === "ADMIN" ? "/admin" : "/llogaria");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
