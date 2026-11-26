/** Recurring Book now schedules: pure rules shared by the UI, the server
 * actions and the cron generator. No database or server imports. */
import { KOSOVO_TIME_ZONE, kosovoLocalToIso } from "./scheduling";
import { commissionRate } from "./commission-policy";

export const SERIES_CADENCES = ["WEEKLY", "BIWEEKLY"] as const;
export type SeriesCadence = (typeof SERIES_CADENCES)[number];
export const cadenceLabels: Record<SeriesCadence, string> = { WEEKLY: "Çdo javë", BIWEEKLY: "Çdo dy javë" };
export const cadenceDays: Record<SeriesCadence, number> = { WEEKLY: 7, BIWEEKLY: 14 };
export const seriesStatusLabels: Record<string, string> = {
  PROPOSED: "Në pritje të klientit", ACTIVE: "Aktive", PAUSED: "Në pauzë", CANCELLED: "Anuluar", DECLINED: "Refuzuar",
};
export const weekdayNames = ["e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë", "e diel"];
/** Upcoming occurrences are created as bookings this far ahead (the cron runs daily). */
export const GENERATION_HORIZON_DAYS = 14;
/** An occurrence is only generated if it starts at least this far from now. */
export const MIN_LEAD_MINUTES = 60;

const parts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
  timeZone: KOSOVO_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
}).formatToParts(d).map(p => [p.type, p.value]));
const weekdayIndex: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Kosovo weekday (0 = Monday) and minutes from midnight of a moment. */
export function kosovoSlot(at: Date) {
  const p = parts(at);
  return { weekday: weekdayIndex[p.weekday], startMinute: Number(p.hour) * 60 + Number(p.minute),
    date: `${p.year}-${p.month}-${p.day}` };
}
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export function seriesLabel(s: { cadence: string; weekday: number; startMinute: number }) {
  return `${cadenceLabels[s.cadence as SeriesCadence] ?? s.cadence}, ${weekdayNames[s.weekday]} në ${clock(s.startMinute)}`;
}

/** The k-th occurrence (k = 0 is the first) keeps the same Kosovo wall-clock
 * time across daylight-saving changes. A time that does not exist on that day
 * (spring-forward gap) returns null and is skipped. */
export function occurrenceAt(first: Date, cadence: SeriesCadence, k: number): Date | null {
  const slot = kosovoSlot(first);
  const day = new Date(`${slot.date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + k * cadenceDays[cadence]);
  try {
    return new Date(kosovoLocalToIso(`${day.toISOString().slice(0, 10)}T${clock(slot.startMinute)}`));
  } catch {
    return null;
  }
}

/** Occurrences strictly after `after` (and not before the first), starting
 * between now + lead time and now + horizon. */
export function upcomingOccurrences(s: { firstStartsAt: Date; cadence: SeriesCadence; generatedUntil: Date | null },
  now: Date, horizonDays = GENERATION_HORIZON_DAYS) {
  const from = Math.max(now.getTime() + MIN_LEAD_MINUTES * 60_000, (s.generatedUntil?.getTime() ?? -Infinity) + 1);
  const until = now.getTime() + horizonDays * 86_400_000;
  const out: Date[] = [];
  const step = cadenceDays[s.cadence] * 86_400_000;
  // Jump close to the window, then walk; a few extra steps absorb DST offsets.
  const startK = Math.max(0, Math.floor((from - s.firstStartsAt.getTime()) / step) - 1);
  for (let k = startK; k < startK + 1000; k++) {
    const at = occurrenceAt(s.firstStartsAt, s.cadence, k);
    if (!at) continue;
    if (at.getTime() > until) break;
    if (at.getTime() >= from && at.getTime() >= s.firstStartsAt.getTime()) out.push(at);
  }
  return out;
}

/** The first occurrence of a pro's proposal: one cadence after the booking it came from. */
export function firstAfter(bookingStartsAt: Date, cadence: SeriesCadence) {
  return occurrenceAt(bookingStartsAt, cadence, 1);
}

/** Every occurrence of an ACTIVE series is a recurring booking: 5% commission. */
export function seriesCommissionBps(categorySlug: string) {
  return commissionRate(categorySlug, { recurring: true, elite: false }).bps;
}

/** Pause or cancel: what happens to bookings already created for the series.
 * Occurrences more than 24 h away are cancelled free; those within 24 h stay
 * and follow the normal cancellation rules if either side cancels them. */
export function occurrencesToRelease<T extends { startsAt: Date; status: string }>(bookings: T[], now: Date, freeHours = 24) {
  return bookings.filter(b => b.status === "CONFIRMED" && b.startsAt.getTime() - now.getTime() >= freeHours * 3_600_000);
}
