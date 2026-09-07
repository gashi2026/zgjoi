import "server-only";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { hashPassword, verifyPassword, type Actor } from "./auth";
import { loginSchema, email, password } from "../validation";
import { signupInput, profileInput } from "../marketplace-validation";
import { enforceLimit } from "./rate-limit";
import { AppError, invariant } from "./errors";
import { opaqueToken, hashToken, validToken } from "./tokens";
import { queueAccountEmail } from "./notifications";

const dummyHash = bcrypt.hashSync(opaqueToken(), 12);

export async function authenticate(input: unknown, ip: string) {
  const data = loginSchema.parse(input);
  await enforceLimit(`login-ip:${ip}`, 30, 15 * 60_000);
  await enforceLimit(`login-account:${data.email}`, 10, 15 * 60_000);
  const user = await db.user.findUnique({ where: { email: data.email } });
  const matches = await verifyPassword(
    data.password,
    user?.passwordHash ?? dummyHash,
  );
  invariant(
    user && matches && !user.suspendedAt,
    "CREDENTIALS",
    401,
    "Email ose fjalëkalim i pasaktë.",
  );
  return { id: user.id, role: user.role };
}

export async function signup(input: unknown, ip: string) {
  const data = signupInput.parse(input);
  await enforceLimit(`signup:${ip}`, 10, 60 * 60_000);
  if (data.role === "PRO") {
    invariant(
      await db.category.findFirst({
        where: { slug: data.categorySlug!, active: true },
      }),
      "CATEGORY",
      400,
      "Zgjidhni një kategori aktive.",
    );
  }
  const passwordHash = await hashPassword(data.password);
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: data.role,
          city: data.city,
          phone: data.phone || null,
          ...(data.role === "PRO"
            ? {
                proProfile: {
                  create: {
                    slug: `${data.name
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .slice(0, 50)}-${opaqueToken().slice(0, 12)}`,
                    categorySlug: data.categorySlug!,
                    about: data.about!,
                    priceFrom: data.priceFrom!,
                    experience: data.experience,
                    serviceCities: [data.city],
                    verification: "PENDING",
                    autoBid: false,
                    weeklyBudget: 0,
                  },
                },
              }
            : {}),
        },
        select: { id: true, role: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: created.id,
          action: "ACCOUNT_CREATED",
          target: created.id,
          meta: { role: created.role },
        },
      });
      return created;
    });
    try {
      await requestAccountToken(user.id, "EMAIL_VERIFY");
    } catch {
      console.error(
        JSON.stringify({ event: "verification_queue_failed", userId: user.id }),
      );
    }
    return user;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AppError(
        "ACCOUNT_EXISTS",
        409,
        "Kjo adresë nuk mund të regjistrohet. Provoni hyrjen ose rivendosjen e fjalëkalimit.",
      );
    throw error;
  }
}

export async function requestAccountToken(
  userId: string,
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET",
) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true },
  });
  const token = opaqueToken();
  return db.$transaction(async (tx) => {
    await tx.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    const record = await tx.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashToken(token),
        expiresAt: new Date(
          Date.now() + (purpose === "PASSWORD_RESET" ? 30 : 24 * 60) * 60_000,
        ),
      },
    });
    return queueAccountEmail(
      tx,
      user.email,
      purpose,
      token,
      record.id,
      record.expiresAt,
    );
  });
}

export async function forgotPassword(input: unknown, ip: string) {
  const data = z.object({ email }).parse(input);
  await enforceLimit(`recovery-ip:${ip}`, 8, 60 * 60_000);
  await enforceLimit(`recovery-email:${data.email}`, 3, 60 * 60_000);
  const user = await db.user.findUnique({
    where: { email: data.email },
    select: { id: true, suspendedAt: true },
  });
  if (user && !user.suspendedAt)
    await requestAccountToken(user.id, "PASSWORD_RESET");
  return {
    ok: true,
    message:
      "Nëse kjo adresë ka llogari aktive, kërkesa për rivendosje është regjistruar. Kontrolloni emailin tuaj.",
  };
}

export async function consumeAccountToken(
  input: unknown,
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET",
) {
  const data = z
    .object({ token: z.string(), password: password.optional() })
    .parse(input);
  invariant(
    validToken(data.token) && (purpose !== "PASSWORD_RESET" || data.password),
    "TOKEN",
    400,
    "Lidhja është e pavlefshme ose ka skaduar.",
  );
  const nextHash = data.password
    ? await hashPassword(data.password)
    : undefined;
  await db.$transaction(async (tx) => {
    const token = await tx.authToken.findUnique({
      where: { tokenHash: hashToken(data.token) },
      include: { user: { select: { suspendedAt: true } } },
    });
    invariant(
      token &&
        token.purpose === purpose &&
        !token.usedAt &&
        token.expiresAt > new Date() &&
        !token.user.suspendedAt,
      "TOKEN",
      400,
      "Lidhja është e pavlefshme ose ka skaduar.",
    );
    const claimed = await tx.authToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    invariant(
      claimed.count === 1,
      "TOKEN",
      409,
      "Kjo lidhje është përdorur tashmë.",
    );
    await tx.user.update({
      where: { id: token.userId },
      data:
        purpose === "EMAIL_VERIFY"
          ? { emailVerified: new Date() }
          : { passwordHash: nextHash! },
    });
    await tx.session.deleteMany({ where: { userId: token.userId } });
    await tx.authToken.updateMany({
      where: { userId: token.userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: token.userId,
        action:
          purpose === "EMAIL_VERIFY" ? "EMAIL_VERIFIED" : "PASSWORD_RESET",
        target: token.userId,
      },
    });
  });
  return { ok: true, redirect: "/hyr" };
}

export async function updateAccount(actor: Actor, input: unknown) {
  const data = profileInput.parse(input);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.id },
      data: { name: data.name, city: data.city, phone: data.phone || null },
    });
    if (actor.role === "PRO" && actor.proProfile) {
      if (data.categorySlug)
        invariant(
          await tx.category.findFirst({
            where: { slug: data.categorySlug, active: true },
          }),
          "CATEGORY",
          400,
          "Kategoria nuk është aktive.",
        );
      const before = await tx.proProfile.findUniqueOrThrow({
        where: { id: actor.proProfile.id },
      });
      const reviewAgain =
        data.name !== actor.name ||
        (data.categorySlug !== undefined &&
          data.categorySlug !== before.categorySlug) ||
        (data.about !== undefined && data.about !== before.about);
      await tx.proProfile.update({
        where: { id: actor.proProfile.id },
        data: {
          ...(reviewAgain ? { verification: "PENDING", verifiedAt: null } : {}),
          about: data.about,
          categorySlug: data.categorySlug,
          priceFrom: data.priceFrom,
          experience: data.experience,
          serviceCities: data.serviceCities,
          autoBid: false,
          weeklyBudget: 0,
        },
      });
    }
    await tx.auditLog.create({
      data: { actorId: actor.id, action: "PROFILE_UPDATED", target: actor.id },
    });
  });
  return { ok: true, message: "Ndryshimet u ruajtën." };
}

export async function changePassword(actor: Actor, input: unknown) {
  const data = z
    .object({ currentPassword: z.string().min(1).max(256), password })
    .parse(input);
  await enforceLimit(`password:${actor.id}`, 5, 15 * 60000);
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { passwordHash: true },
  });
  invariant(
    await verifyPassword(data.currentPassword, user.passwordHash),
    "CREDENTIALS",
    400,
    "Fjalëkalimi aktual nuk është i saktë.",
  );
  const nextHash = await hashPassword(data.password);
  await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: {
        id: actor.id,
        passwordHash: user.passwordHash,
        suspendedAt: null,
      },
      data: { passwordHash: nextHash },
    });
    invariant(
      updated.count === 1,
      "STALE",
      409,
      "Llogaria ka ndryshuar. Hyni përsëri.",
    );
    await tx.session.deleteMany({ where: { userId: actor.id } });
    await tx.authToken.updateMany({
      where: { userId: actor.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.auditLog.create({
      data: { actorId: actor.id, action: "PASSWORD_CHANGED", target: actor.id },
    });
  });
}
