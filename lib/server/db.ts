import { PrismaClient } from "@prisma/client";

/* A single Prisma client, reused across hot reloads in development. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Note: constructing the client does not open a connection, so this is safe
 * even before DATABASE_URL is configured. The first *query* is what fails —
 * and every query lives inside a force-dynamic page or an API route, never
 * at build time.
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
