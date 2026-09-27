import { z } from "zod";
import { KOSOVO_TIME_ZONE, kosovoLocalToIso } from "./scheduling";

export const recurrenceSchema = z.object({
  version: z.literal(1), parentRequestId: z.string().min(1).max(100),
  cadence: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]), scheduledAt: z.string().datetime(),
});
export type Recurrence = z.infer<typeof recurrenceSchema>;
export const recurrenceLabels = { WEEKLY: "Çdo javë", FORTNIGHTLY: "Çdo dy javë", MONTHLY: "Çdo muaj" };
export function readRecurrence(answers: unknown): Recurrence | null {
  if (!answers || typeof answers !== "object" || !("recurrence" in answers)) return null;
  const parsed = recurrenceSchema.safeParse(answers.recurrence);
  return parsed.success ? parsed.data : null;
}
/** Advance Kosovo wall time, clamp month-end dates, reject nonexistent DST time. */
export function nextRecurringDate(from: Date, cadence: Recurrence["cadence"]) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: KOSOVO_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(from).map(v => [v.type, v.value]));
  const date = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  if (cadence === "MONTHLY") {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(Number(p.day), last));
  } else date.setUTCDate(date.getUTCDate() + (cadence === "WEEKLY" ? 7 : 14));
  return new Date(kosovoLocalToIso(`${date.toISOString().slice(0, 10)}T${p.hour}:${p.minute}`));
}
