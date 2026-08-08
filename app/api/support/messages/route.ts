import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { supportStatus } from "@/lib/support-hours";

export const dynamic = "force-dynamic";

/**
 * The widget polls this every few seconds while it is open. Polling keeps
 * the whole thing serverless-friendly — no websocket server to run.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticketId");
  const status = supportStatus();

  if (!ticketId) return NextResponse.json({ status, messages: [] });

  const messages = await db.supportMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, body: true, fromAgent: true, createdAt: true },
  });

  return NextResponse.json({
    status,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      fromAgent: m.fromAgent,
      time: new Intl.DateTimeFormat("sq", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Belgrade",
      }).format(m.createdAt),
    })),
  });
}
