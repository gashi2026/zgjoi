import { NextResponse } from "next/server";
import { agentReply } from "@/app/actions/support";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { ticketId, body } = await req.json().catch(() => ({}));
  if (!ticketId || !body) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json(await agentReply(ticketId, String(body)));
}
