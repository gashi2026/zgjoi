import { api, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { z } from "zod";
import { entityId } from "@/lib/marketplace-validation";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => {
    const user = await requireUser();
    const [notifications, unread] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return { notifications, unread };
  });
}
export async function POST(req: Request) {
  return api(req, async () => {
    const user = await requireUser(),
      data = z
        .object({ ids: z.array(entityId).max(100) })
        .parse(await readJson(req));
    await db.notification.updateMany({
      where: { userId: user.id, id: { in: data.ids }, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  });
}
