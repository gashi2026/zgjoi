import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({
      user: { name: user.name, role: user.role },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
