import { NextResponse } from "next/server";
import { sendSupportMessage } from "@/app/actions/support";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

  const result = await sendSupportMessage({
    ticketId: body.ticketId ?? undefined,
    body: String(body.body ?? ""),
    guestName: body.guestName,
    guestEmail: body.guestEmail,
  });

  return NextResponse.json(result);
}
