import { api } from "@/lib/server/http";
import { requireRole } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return api(req, async () => {
    await requireRole("ADMIN", "SUPPORT");
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .parse(new URL(req.url).searchParams.get("page") || 1);
    const tickets = await db.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      skip: (page - 1) * 50,
      select: {
        id: true,
        subject: true,
        state: true,
        offline: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    return { tickets, page, hasMore: tickets.length === 50 };
  });
}
