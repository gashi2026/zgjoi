import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
export type Role = "CLIENT" | "PRO" | "ADMIN" | "SUPPORT";

const COOKIE = "zgjoi_session";
const DAYS = 30;

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/* ------------------------------------------------------------ sessions */

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 864e5);

  await db.session.create({ data: { userId, token, expiresAt } });

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  cookies().delete(COOKIE);
}

/**
 * Current user, or null. Cached per request so repeated calls in one
 * render don't hit the database again.
 */
export const currentUser = cache(async () => {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          city: true,
          suspendedAt: true,
          proProfile: { select: { id: true, slug: true, verification: true } },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.suspendedAt) return null;
  return session.user;
});

/* --------------------------------------------------------- guard rails */

export class AuthError extends Error {}

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
