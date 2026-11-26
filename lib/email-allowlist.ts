/**
 * Outside production, outgoing email is limited to an explicit allowlist so a
 * Preview or local build can never mail real customers.
 *
 * EMAIL_ALLOWLIST: comma/space separated entries. An entry is either a full
 * address (owner@example.com) or a domain (example.com or @example.com, which
 * also matches subdomains). Empty or missing = nothing is sent outside
 * production. Production (VERCEL_ENV === "production") is not affected.
 */
export type EmailEnv = { VERCEL_ENV?: string; EMAIL_ALLOWLIST?: string };

export function isProductionEmailEnv(env: EmailEnv) {
  return env.VERCEL_ENV === "production";
}

export function parseEmailAllowlist(raw: string | undefined) {
  return (raw ?? "")
    .split(/[\s,;]+/)
    .map((entry) => entry.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function emailRecipientAllowed(to: string, env: EmailEnv) {
  if (isProductionEmailEnv(env)) return true;
  const address = to.trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at < 1) return false;
  const domain = address.slice(at + 1);
  return parseEmailAllowlist(env.EMAIL_ALLOWLIST).some((entry) =>
    entry.includes("@")
      ? entry === address
      : domain === entry || domain.endsWith(`.${entry}`),
  );
}

/** For logs only: keeps the domain, hides the mailbox. */
export function maskEmail(to: string) {
  const at = to.lastIndexOf("@");
  return at < 1 ? "***" : `${to[0]}***@${to.slice(at + 1)}`;
}
