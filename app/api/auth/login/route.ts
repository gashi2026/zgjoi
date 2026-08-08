import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { verifyPassword, createSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "Email ose fjalëkalim i pasaktë." });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    const generic = { ok: false, message: "Email ose fjalëkalim i pasaktë." };

    if (!user) return NextResponse.json(generic);
    if (!(await verifyPassword(password, user.passwordHash))) return NextResponse.json(generic);
    if (user.suspendedAt) return NextResponse.json({ ok: false, message: "Kjo llogari është pezulluar." });

    await createSession(user.id);

    const redirect =
      user.role === "ADMIN" ? "/admin" :
      user.role === "PRO" ? "/pro/paneli" :
      "/llogaria";

    return NextResponse.json({ ok: true, redirect });
  } catch (err) {
    console.error("Login error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message: `Gabim teknik: ${detail.slice(0, 180)}` });
  }
}
