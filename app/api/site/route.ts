import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const site = (await getSiteSettings()) ?? {};
  return NextResponse.json({ logoUrl: site.logoUrl ?? null });
}
