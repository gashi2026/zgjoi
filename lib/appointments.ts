import { KOSOVO_TIME_ZONE } from "./scheduling";

export const MAX_APPOINTMENT_MINUTES = 30 * 24 * 60;
/** New offers use canonical minutes; narrowly parse existing numeric/Albanian hour labels. */
export function appointmentMinutes(value: string | null) {
  if (!value) return null;
  const text = value.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const words: Record<string, number> = { nje: 1, dy: 2, tre: 3, kater: 4, pese: 5, gjashte: 6, shtate: 7, tete: 8 };
  const match = text.match(/^(\d+(?:[.,]\d+)?|nje|dy|tre|kater|pese|gjashte|shtate|tete)\s*(min|minuta|minute|minutes|h|ore|hours?)?$/);
  if (!match) return null;
  const n = words[match[1]] ?? Number(match[1].replace(",", "."));
  const minutes = n * (/^(h|ore|hours?)$/.test(match[2] ?? "") ? 60 : 1);
  return Number.isSafeInteger(minutes) && minutes > 0 && minutes <= MAX_APPOINTMENT_MINUTES ? minutes : null;
}
export function appointmentEnd(start: Date | string, duration: string | null) {
  const minutes = appointmentMinutes(duration), time = new Date(start).getTime();
  return minutes && Number.isFinite(time) ? new Date(time + minutes * 60_000) : null;
}
export type WorkingDay = { weekday: number; startMin: number; endMin: number };
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: KOSOVO_TIME_ZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** No saved weekly hours means appointments are agreed individually in the official offer. */
export function withinWorkingHours(start: Date, end: Date, days: WorkingDay[]) {
  if (!Number.isFinite(start.getTime()) || end <= start || end.getTime() - start.getTime() > MAX_APPOINTMENT_MINUTES * 60_000) return false;
  if (!days.length) return true;
  // Inspect each elapsed minute, including repeated DST hours. Jump only as far as
  // the current working-period boundary so even a sub-minute overflow is denied.
  for (let time = start.getTime(); time < end.getTime();) {
    const date = new Date(time);
    const parts = Object.fromEntries(clock.formatToParts(date).map(p => [p.type, p.value]));
    const day = days.find(d => d.weekday === weekdays.indexOf(parts.weekday));
    const minute = Number(parts.hour) * 60 + Number(parts.minute) + (date.getUTCSeconds() * 1000 + date.getUTCMilliseconds()) / 60_000;
    if (!day || minute < day.startMin || minute >= day.endMin) return false;
    time += Math.min(60_000, (day.endMin - minute) * 60_000, end.getTime() - time);
  }
  return true;
}
