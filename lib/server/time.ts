import "server-only";
/** Request-time cutoff for dynamic reporting queries. */
export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000);
}
