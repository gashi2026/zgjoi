import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPPORT")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const tickets = await db.supportTicket.findMany({
    orderBy: [{ offline: "desc" }, { updatedAt: "desc" }],
    take: 50,
    include: { user: { select: { name: true } }, _count: { select: { messages: true } } },
  });

  return NextResponse.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      who: t.user?.name ?? t.guestName ?? "Vizitor",
      subject: t.subject ?? "—",
      state: t.state,
      offline: t.offline,
      unread: t._count.messages,
      updatedAt: new Intl.DateTimeFormat("sq", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Belgrade",
      }).format(t.updatedAt),
    })),
  });
}
