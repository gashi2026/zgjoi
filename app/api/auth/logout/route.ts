import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try { await destroySession(); } catch { /* already gone */ }
  return NextResponse.json({ ok: true });
}
