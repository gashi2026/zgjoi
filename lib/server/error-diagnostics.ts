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
    databaseFailureReason?: string;
    databaseProjectRef?: string;
    databasePasswordState?: string;
  } = {};
  if (typeof code === "string" && /^P\d{4}$/.test(code))
    details.databaseErrorCode = code;
  if (initialization) {
    // Pooler failures can omit Prisma's errorCode. Classify only known phrases;
    // never emit the message, which may embed credentials or connection details.
    const reasons: [RegExp, string][] = [
      [/tenant or user not found/i, "pooler_tenant_or_user_not_found"],
      [/password authentication failed|authentication failed|invalid password/i, "authentication_failed"],
      [/environment variable not found/i, "environment_variable_missing"],
      [/database string is invalid|invalid (?:database|connection) (?:url|string)/i, "invalid_connection_string"],
      [/maxclientsinsessionmode|too many (?:clients|connections)|remaining connection slots/i, "connection_limit"],
      [/timed out fetching a new connection|connection pool timeout/i, "pool_timeout"],
      [/tls|ssl.*(?:error|certificate)|certificate.*(?:invalid|verify)/i, "tls_error"],
      [/could not locate the query engine|unable to require.*query_engine|query engine library/i, "query_engine_unavailable"],
      [/can't reach database server|connection refused|no route to host|network is unreachable/i, "database_unreachable"],
      [/connection.*(?:timed out|timeout)|connect timeout/i, "connection_timeout"],
      [/server (?:has )?closed the connection|connection.*closed/i, "connection_closed"],
    ];
    details.databaseFailureReason = reasons.find(([pattern]) =>
      pattern.test(error.message),
    )?.[1] ?? "unclassified";
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
        if (["supabase_direct", "supabase_pooler"].includes(details.databaseEndpoint)) {
          // Project references are public identifiers. Do not log the username,
          // hostname, password, or any substring/hash of the password.
          details.databaseProjectRef =
            url.hostname.match(/^db\.([a-z]{20})\.supabase\.co$/)?.[1] ??
            url.username.match(/\.([a-z]{20})$/)?.[1];
          details.databasePasswordState = !url.password
            ? "missing"
            : /^(?:\[YOUR[-_]PASSWORD\]|%5BYOUR[-_]PASSWORD%5D|YOUR[-_]PASSWORD)$/i.test(url.password)
              ? "placeholder"
              : "present";
        }
      } catch {
        details.databaseEndpoint = "invalid";
      }
    }
  }
  return details;
}
