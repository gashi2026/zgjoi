import "server-only";
import { Prisma } from "@prisma/client";

/** Log fixed classifications only, never a connection URL or Prisma message. */
export function databaseFailureDetails(error: unknown) {
  const initialization = error instanceof Prisma.PrismaClientInitializationError;
  const code = initialization
    ? error.errorCode
    : error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : undefined;
  const details: {
    databaseErrorCode?: string;
    databaseEndpoint?: string;
  } = {};
  if (typeof code === "string" && /^P\d{4}$/.test(code))
    details.databaseErrorCode = code;
  if (initialization) {
    const value = process.env.DATABASE_URL;
    if (!value) details.databaseEndpoint = "missing";
    else {
      try {
        const url = new URL(value);
        details.databaseEndpoint = !["postgres:", "postgresql:"].includes(
          url.protocol,
        )
          ? "invalid"
          : /^db\.[a-z0-9]+\.supabase\.co$/.test(url.hostname)
            ? "supabase_direct"
            : url.hostname.endsWith(".pooler.supabase.com")
              ? "supabase_pooler"
              : "other";
      } catch {
        details.databaseEndpoint = "invalid";
      }
    }
  }
  return details;
}
