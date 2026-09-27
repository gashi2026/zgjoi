export function maintenanceState(value: unknown, now: number) {
  const ranAt = typeof value === "object" && value !== null && "ranAt" in value && typeof value.ranAt === "string"
    ? Date.parse(value.ranAt) : NaN;
  if (!Number.isFinite(ranAt) || ranAt > now + 60000) return "UNKNOWN";
  // The maintenance worker is scheduled every five minutes; allow three intervals.
  return now - ranAt > 15 * 60000 ? "LATE" : "RECENT";
}
