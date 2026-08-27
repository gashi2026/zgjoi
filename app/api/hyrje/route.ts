import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let fjalekalimi = "";
  try {
    const body = await req.json();
    fjalekalimi = typeof body?.fjalekalimi === "string" ? body.fjalekalimi : "";
  } catch {
    // invalid body → falls through to 401
  }

  const password = process.env.ZGJOI_PASSWORD;

  if (!password || fjalekalimi !== password) {
    return NextResponse.json(
      { ok: false, mesazhi: "Fjalëkalimi nuk është i saktë." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("zgjoi_preview", password, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}
