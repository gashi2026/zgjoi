/** Pro trust history (owner, 26 Nov 2026). Pure classification and totals. */
/** Arrived (Arrita check-in, else job start) more than this many minutes after the booked start = late. */
export const LATE_AFTER_MINUTES = 15;
/** Cancellations are counted over this window. */
export const CANCELLATION_WINDOW_DAYS = 90;
/** At this many pro cancellations in the window, admins get a review alert. */
export const CANCELLATION_ALERT_THRESHOLD = 3;
/** The trust history is public to customers on the pro profile. */
export const TRUST_PUBLIC = true;
/** Pro-side reasons a hired job ended unfinished. */
export const PRO_SIDE_CANCELLATIONS = ["PRO", "PRO_NO_SHOW"];
export const NOT_FINISHED_REASONS = [...PRO_SIDE_CANCELLATIONS, "DISPUTE_REFUND"];

export type TrustJob = { state: string; scheduledAt: Date | null; startedAt: Date | null; arrivedAt?: Date | null; cancelledAt: Date | null; cancelledBy: string | null; hasDispute: boolean };
export type JobClass = "ON_TIME" | "LATE" | "NOT_FINISHED" | null;

export function classifyJob(job: TrustJob): JobClass {
  if (job.state === "COMPLETED") {
    const arrived = job.arrivedAt ?? job.startedAt;
    if (job.scheduledAt && arrived && arrived.getTime() - job.scheduledAt.getTime() > LATE_AFTER_MINUTES * 60_000) return "LATE";
    return "ON_TIME";
  }
  if (job.state === "CANCELLED" && job.cancelledBy && NOT_FINISHED_REASONS.includes(job.cancelledBy)) return "NOT_FINISHED";
  return null; // still active, or ended by the customer: not the pro's record
}

export type TrustSummary = { booked: number; onTime: number; late: number; notFinished: number; disputes: number; cancellations: number };
export function summarizeTrust(jobs: TrustJob[], now: Date): TrustSummary {
  const since = now.getTime() - CANCELLATION_WINDOW_DAYS * 86_400_000;
  const out: TrustSummary = { booked: jobs.length, onTime: 0, late: 0, notFinished: 0, disputes: 0, cancellations: 0 };
  for (const job of jobs) {
    const c = classifyJob(job);
    if (c === "ON_TIME") out.onTime++;
    else if (c === "LATE") out.late++;
    else if (c === "NOT_FINISHED") out.notFinished++;
    if (job.hasDispute) out.disputes++;
    if (job.state === "CANCELLED" && job.cancelledBy && PRO_SIDE_CANCELLATIONS.includes(job.cancelledBy) && job.cancelledAt && job.cancelledAt.getTime() >= since) out.cancellations++;
  }
  return out;
}
export function shouldAlert(cancellations: number) {
  return cancellations >= CANCELLATION_ALERT_THRESHOLD;
}

/** Donut segments: green on time, gold late, red not finished. */
export function donutSegments(s: Pick<TrustSummary, "onTime" | "late" | "notFinished">) {
  const total = s.onTime + s.late + s.notFinished;
  const rows = [
    { key: "onTime", label: "Në kohë", value: s.onTime, color: "#2F9B5F" },
    { key: "late", label: "Me vonesë", value: s.late, color: "#FFB800" },
    { key: "notFinished", label: "Pa përfunduar", value: s.notFinished, color: "#D9534F" },
  ];
  return { total, rows: rows.map(r => ({ ...r, pct: total ? Math.round((r.value * 100) / total) : 0 })) };
}
