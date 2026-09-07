import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { invariant } from "./errors";

const schema = z.object({
  version: z.string().min(16), enabled: z.boolean(), secretEnc: z.string(),
  lastStep: z.number().int(), recoveryHashes: z.array(z.string()).max(10),
  enrollmentExpiresAt: z.number(),
});
export type MfaState = z.infer<typeof schema>;
export const mfaKey = (userId: string) => `account-mfa:v1:${userId}`;
export async function readMfa(tx: Pick<Prisma.TransactionClient, "setting">, userId: string) {
  const record = await tx.setting.findUnique({ where: { key: mfaKey(userId) } });
  if (!record) return null;
  const parsed = schema.safeParse(record.value);
  invariant(parsed.success, "MFA_CONFIG", 503, "Siguria e llogarisë kërkon kontroll. Provoni më vonë.");
  return parsed.data;
}
export async function writeMfa(tx: Pick<Prisma.TransactionClient, "setting">, userId: string, state: MfaState) {
  await tx.setting.upsert({ where: { key: mfaKey(userId) },
    create: { key: mfaKey(userId), value: state }, update: { value: state } });
}
