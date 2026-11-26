/** Kosovo civil time, independent of the browser or server's own timezone. */
export const KOSOVO_TIME_ZONE = "Europe/Belgrade";
const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: KOSOVO_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
function wallTime(date: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function kosovoLocalToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Shkruani datën dhe orën e plotë të Kosovës.");
  const wall = new Date(`${value}:00Z`);
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 16) !== value)
    throw new Error("Data ose ora nuk është e vlefshme.");
  // Sample both sides of a DST transition, then require an exact round trip.
  const candidates = new Set<string>();
  for (const delta of [-86400000, 0, 86400000]) {
    const sample = new Date(wall.getTime() + delta);
    const offset = Date.parse(`${wallTime(sample)}:00Z`) - sample.getTime();
    const candidate = new Date(wall.getTime() - offset);
    if (wallTime(candidate) === value) candidates.add(candidate.toISOString());
  }
  if (candidates.size !== 1)
    throw new Error(candidates.size === 0
      ? "Kjo orë nuk ekziston gjatë ndryshimit të orës në Kosovë. Zgjidhni një orë tjetër."
      : "Kjo orë përsëritet gjatë ndryshimit të orës në Kosovë. Zgjidhni një orë tjetër.");
  return [...candidates][0];
}
