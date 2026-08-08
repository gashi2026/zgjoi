import { NextResponse, type NextRequest } from "next/server";

/**
 * Gatekeeper for private areas. This only checks that a session cookie
 * exists — the real role check happens in the page/action with
 * requireRole(), because middleware runs on the edge without database
 * access. Cheap first line, strict second line.
 */
const PROTECTED = ["/llogaria", "/pro", "/admin", "/kerkesa-e-re"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!needsAuth) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get("zgjoi_session")?.value);
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/hyr";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /* everything except static assets and the Stripe webhook */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe).*)",
  ],
};
