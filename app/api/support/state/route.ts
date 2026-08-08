import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const me = await currentUser();
    if (!me || (me.role !== "ADMIN" && me.role !== "SUPPORT")) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    const { ticketId, state } = await req.json();
    if (!ticketId || !["OPEN", "WAITING", "RESOLVED"].includes(state)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await db.supportTicket.update({
      where: { id: ticketId },
      data: { state },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
