/** Recurring Book now schedules: pure rules shared by the UI, the server
 * actions and the cron generator. No database or server imports. */
import { KOSOVO_TIME_ZONE, kosovoLocalToIso } from "./scheduling";
import { commissionRate } from "./commission-policy";

export const SERIES_CADENCES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export type SeriesCadence = (typeof SERIES_CADENCES)[number];
export const cadenceLabels: Record<SeriesCadence, string> = { WEEKLY: "Çdo javë", BIWEEKLY: "Çdo dy javë", MONTHLY: "Çdo muaj" };
/** Choice labels on the booking and proposal forms. */
export const cadenceOptionLabels: Record<SeriesCadence, string> = {
  WEEKLY: "Çdo javë, e njëjta ditë dhe orë", BIWEEKLY: "Çdo dy javë, e njëjta ditë dhe orë",
  MONTHLY: "Çdo muaj, e njëjta datë dhe orë (29–31: dita e fundit e muajit)",
};
/** Weekly cadences step in days; MONTHLY steps in calendar months (see occurrenceAt). */
export const cadenceDays: Record<SeriesCadence, number> = { WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 31 };
export const seriesStatusLabels: Record<string, string> = {
  PROPOSED: "Në pritje të klientit", ACTIVE: "Aktive", PAUSED: "Në pauzë", CANCELLED: "Anuluar", DECLINED: "Refuzuar",
};
export const weekdayNames = ["e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë", "e diel"];
/** Upcoming occurrences are created as bookings this far ahead (the cron runs daily). */
export const GENERATION_HORIZON_DAYS = 14;
/** Owner (26 Nov 2026): visits are always booked at least a week ahead, and the
 * next visit always exists (a monthly visit can be beyond the 14-day window). */
export const MIN_AHEAD_DAYS = 7;
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
/** Kosovo day of the month (1–31). */
export const kosovoDay = (at: Date) => Number(kosovoSlot(at).date.slice(8));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export function seriesLabel(s: { cadence: string; weekday: number; startMinute: number; firstStartsAt?: Date; monthDay?: number | null }) {
  if (s.cadence === "MONTHLY") {
    const day = s.monthDay ?? (s.firstStartsAt ? kosovoDay(s.firstStartsAt) : null);
    return `Çdo muaj, ${day ? `më ${day}${day >= 29 ? " (ose dita e fundit e muajit)" : ""}` : "e njëjta datë"} në ${clock(s.startMinute)}`;
  }
  return `${cadenceLabels[s.cadence as SeriesCadence] ?? s.cadence}, ${weekdayNames[s.weekday]} në ${clock(s.startMinute)}`;
}

/** The k-th occurrence (k = 0 is the first) keeps the same Kosovo wall-clock
 * time across daylight-saving changes. Weekly/biweekly: same weekday. Monthly:
 * the series' day of the month (monthDay, else the first visit's day) counted
 * from the first visit's month; in shorter months (29–31) the last day of that
 * month, so Jan 31 → Feb 28 → Mar 31. A time that does not exist on that day
 * (spring-forward gap) returns null and is skipped. */
export function occurrenceAt(first: Date, cadence: SeriesCadence, k: number, monthDay?: number | null): Date | null {
  const slot = kosovoSlot(first);
  const [y, m, d] = slot.date.split("-").map(Number);
  let day: Date;
  if (cadence === "MONTHLY") {
    const last = new Date(Date.UTC(y, m - 1 + k + 1, 0)).getUTCDate();
    day = new Date(Date.UTC(y, m - 1 + k, Math.min(monthDay ?? d, last)));
  } else {
    day = new Date(Date.UTC(y, m - 1, d));
    day.setUTCDate(day.getUTCDate() + k * cadenceDays[cadence]);
  }
  try {
    return new Date(kosovoLocalToIso(`${day.toISOString().slice(0, 10)}T${clock(slot.startMinute)}`));
  } catch {
    return null;
  }
}

/** Occurrences strictly after the cursor (and not before the first), starting
 * between now + lead time and now + horizon. */
export function upcomingOccurrences(s: { firstStartsAt: Date; cadence: SeriesCadence; generatedUntil: Date | null; monthDay?: number | null },
  now: Date, horizonDays = GENERATION_HORIZON_DAYS) {
  return occurrencesBetween(s, now, now.getTime() + horizonDays * 86_400_000);
}
function occurrencesBetween(s: { firstStartsAt: Date; cadence: SeriesCadence; generatedUntil: Date | null; monthDay?: number | null }, now: Date, until: number, max = 1000) {
  const from = Math.max(now.getTime() + MIN_LEAD_MINUTES * 60_000, (s.generatedUntil?.getTime() ?? -Infinity) + 1);
  const out: Date[] = [];
  // Jump close to the window (never past it), then walk; extra steps absorb DST and month lengths.
  const startK = Math.max(0, Math.floor((from - s.firstStartsAt.getTime()) / (cadenceDays[s.cadence] * 86_400_000)) - 1);
  for (let k = startK; k < startK + 2000 && out.length < max; k++) {
    const at = occurrenceAt(s.firstStartsAt, s.cadence, k, s.monthDay);
    if (!at) continue;
    if (at.getTime() > until) break;
    if (at.getTime() >= from && at.getTime() >= s.firstStartsAt.getTime()) out.push(at);
  }
  return out;
}

/** What the generator books now: every visit within the 14-day window, plus —
 * when no booked visit starts at least MIN_AHEAD_DAYS from now — the next visit
 * after the cursor even if it is beyond the window (monthly series). */
export function plannedOccurrences(s: { firstStartsAt: Date; cadence: SeriesCadence; generatedUntil: Date | null; monthDay?: number | null },
  now: Date, latestLiveStart: Date | null) {
  const planned = upcomingOccurrences(s, now);
  const aheadBy = now.getTime() + MIN_AHEAD_DAYS * 86_400_000;
  const covered = [latestLiveStart, ...planned].some(d => d && d.getTime() >= aheadBy);
  if (!covered) {
    const cursor = planned.at(-1) ?? s.generatedUntil;
    const next = occurrencesBetween({ ...s, generatedUntil: cursor ?? null }, now, Infinity, 1)[0];
    if (next) planned.push(next);
  }
  return planned;
}

/** The first occurrence of a pro's proposal: one cadence after the booking it came from. */
export function firstAfter(bookingStartsAt: Date, cadence: SeriesCadence) {
  return occurrenceAt(bookingStartsAt, cadence, 1, kosovoDay(bookingStartsAt));
}

/** Owner (26 Nov 2026): the first visit of a series pays the normal commission
 * (15%, or 10% elite); every later visit of an ACTIVE series pays 5%. */
export function isRecurringVisit(series: { firstStartsAt: Date }, occurrenceAt: Date | null | undefined) {
  return !!occurrenceAt && occurrenceAt.getTime() > series.firstStartsAt.getTime();
}
export function seriesCommissionBps(categorySlug: string) {
  return commissionRate(categorySlug, { recurring: true, elite: false }).bps;
}


/** Pause or cancel copy: one visit uses the singular in both languages (via the catalog). */
export function upcomingCancelledLabel(released: number) {
  return released === 1
    ? "1 vizitë e ardhshme u anulua falas."
    : `${released} vizita të ardhshme u anuluan falas.`;
}

/** Pause or cancel: what happens to bookings already created for the series.
 * Occurrences more than 24 h away are cancelled free; those within 24 h stay
 * and follow the normal cancellation rules if either side cancels them. */
export function occurrencesToRelease<T extends { startsAt: Date; status: string }>(bookings: T[], now: Date, freeHours = 24) {
  return bookings.filter(b => b.status === "CONFIRMED" && b.startsAt.getTime() - now.getTime() >= freeHours * 3_600_000);
}
