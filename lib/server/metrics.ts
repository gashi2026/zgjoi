import "server-only";
import { db } from "./db";
import { invariant } from "./errors";

/** One request cohort, counted once per request, not once per offer revision or audit event. */
export async function bookingFunnel(since: Date, until = new Date()) {
  invariant(Number.isFinite(since.getTime()) && Number.isFinite(until.getTime()) && since < until,
    "METRICS_RANGE", 400, "Periudha nuk është e vlefshme.");
  const [counts] = await db.$queryRaw<{
    inquiries: bigint; offered: bigint; accepted: bigint; funded: bigint; completed: bigint;
  }[]>`
    SELECT count(*) AS inquiries,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public."Quote" q WHERE q."requestId" = r.id)) AS offered,
      count(*) FILTER (WHERE r."acceptedQuoteId" IS NOT NULL) AS accepted,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public."Payment" p WHERE p."requestId" = r.id AND p."heldAt" IS NOT NULL)) AS funded,
      count(*) FILTER (WHERE r."completedAt" IS NOT NULL) AS completed
    FROM public."ServiceRequest" r WHERE r."createdAt" >= ${since} AND r."createdAt" < ${until}`;
  const stages = ["inquiries", "offered", "accepted", "funded", "completed"] as const;
  const values = Object.fromEntries(stages.map(stage => [stage, Number(counts[stage])])) as Record<typeof stages[number], number>;
  return { since: since.toISOString(), until: until.toISOString(), ...values,
    coherent: stages.every((stage, i) => i === 0 || values[stage] <= values[stages[i - 1]]),
  };
}
