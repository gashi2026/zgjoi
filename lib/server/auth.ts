import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { AppError } from "./errors";
import { opaqueToken, hashToken, validToken } from "./tokens";
export type Role = "CLIENT" | "PRO" | "ADMIN" | "SUPPORT";

const COOKIE = "zgjoi_session";
const DAYS = 30;

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) =>
  bcrypt.compare(pw, hash);

/* ------------------------------------------------------------ sessions */

export async function createSession(userId: string) {
  const token = opaqueToken();
  const expiresAt = new Date(Date.now() + DAYS * 864e5);

  const old = (await cookies()).get(COOKIE)?.value;
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { suspendedAt: true },
    });
    if (!user || user.suspendedAt) throw new AuthError("UNAUTHENTICATED");
    if (old && validToken(old))
      await tx.session.deleteMany({ where: { token: hashToken(old) } });
    await tx.session.create({
      data: { userId, token: hashToken(token), expiresAt },
    });
  });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  (await cookies()).delete("zgjoi_support");
}

export async function destroySession() {
  const token = (await cookies()).get(COOKIE)?.value;
  try {
    if (token && validToken(token))
      await db.session.deleteMany({ where: { token: hashToken(token) } });
  } finally {
    (await cookies()).delete(COOKIE);
    (await cookies()).delete("zgjoi_support");
  }
}

/**
 * Current user, or null. Cached per request so repeated calls in one
 * render don't hit the database again.
 */
export const currentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!validToken(token)) return null;

  const session = await db.session.findUnique({
    where: { token: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          city: true,
          suspendedAt: true,
          emailVerified: true,
          proProfile: { select: { id: true, slug: true, verification: true } },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) return null;
  if (session.user.suspendedAt) return null;
  return session.user;
});

/* --------------------------------------------------------- guard rails */

export class AuthError extends AppError {
  constructor(code: string) {
    super(
      code,
      code === "UNAUTHENTICATED" ? 401 : 403,
      code === "UNAUTHENTICATED"
        ? "Hyni në llogarinë tuaj për të vazhduar."
        : "Nuk keni qasje në këtë veprim.",
    );
  }
}

export const accountHome = (role: Role) =>
  role === "ADMIN"
    ? "/admin"
    : role === "SUPPORT"
      ? "/admin/mbeshtetja"
      : role === "PRO"
        ? "/pro/paneli"
        : "/llogaria";
export type Actor = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
}

export async function requirePro() {
  const user = await requireRole("PRO");
  if (!user.proProfile) throw new AuthError("NO_PROFILE");
  return { user, profile: user.proProfile };
}
