import "server-only";
import { db } from "./db";

/**
 * Commission lives in the database so it can change without a deploy —
 * and so historical payments keep the rate that applied when they were
 * captured (snapshotted into Payment.commissionBps).
 */
const DEFAULT_COMMISSION_BPS = 1500; // 15.00%

export async function commissionBps(): Promise<number> {
  const row = await db.setting.findUnique({ where: { key: "commission_bps" } });
  const value = Number((row?.value as any) ?? DEFAULT_COMMISSION_BPS);
  return Number.isFinite(value) ? value : DEFAULT_COMMISSION_BPS;
}

export function splitAmount(amount: number, bps: number) {
  const commissionAmount = Math.round((amount * bps) / 10_000);
  return { commissionAmount, proAmount: amount - commissionAmount };
}

/** Cost charged to a professional for opening a lead, in cents. */
export async function leadCostCents(): Promise<number> {
  const row = await db.setting.findUnique({ where: { key: "lead_cost_cents" } });
  return Number((row?.value as any) ?? 400);
}
