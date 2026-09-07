import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { notificationPreferences, saveNotificationPreferences } from "@/lib/server/notification-preferences";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => notificationPreferences(db, (await requireUser()).id));
}
export async function POST(req: Request) {
  return api(req, async () => saveNotificationPreferences((await requireUser()).id, await readJson(req)));
}
