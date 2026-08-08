import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** Job chat between a client and a professional. Polled by the chat view. */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ messages: [] });

  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { request: { select: { clientId: true, acceptedProfileId: true } } },
  });
  if (!convo) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // only the two parties may read the thread
  const profile = await db.proProfile.findUnique({ where: { userId: user.id } });
  const allowed =
    convo.request.clientId === user.id ||
    (profile && convo.request.acceptedProfileId === profile.id) ||
    user.role === "ADMIN";
  if (!allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, body: true, senderId: true, createdAt: true },
  });

  return NextResponse.json({
    me: user.id,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      mine: m.senderId === user.id,
      time: new Intl.DateTimeFormat("sq", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Belgrade",
      }).format(m.createdAt),
    })),
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { conversationId, body } = await req.json();
  if (!conversationId || !body?.trim()) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  const message = await db.message.create({
    data: { conversationId, senderId: user.id, body: String(body).slice(0, 2000) },
  });

  return NextResponse.json({ ok: true, id: message.id });
}
