import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
const schema = z.object({ jobEmail: z.boolean() });
export const notificationPreferenceKey = (id: string) => `account-notifications:v1:${id}`;
export async function notificationPreferences(tx: Pick<Prisma.TransactionClient, "setting">, userId: string) {
  const row = await tx.setting.findUnique({ where: { key: notificationPreferenceKey(userId) }, select: { value: true } });
  const value = schema.safeParse(row?.value);
  return value.success ? value.data : { jobEmail: false };
}
export async function saveNotificationPreferences(userId: string, input: unknown) {
  const value = schema.parse(input);
  await db.setting.upsert({ where: { key: notificationPreferenceKey(userId) },
    create: { key: notificationPreferenceKey(userId), value }, update: { value } });
  return { ok: true, message: "Preferencat u ruajtën. Njoftimet në llogari mbeten aktive." };
}
