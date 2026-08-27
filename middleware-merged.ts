import { NextResponse, type NextRequest } from "next/server";

/**
 * Two gates, in order.
 *
 * 1. Site lock — while ZGJOI_PASSWORD is set in Vercel, the whole site
 *    shows the coming-soon page. Delete the variable to go public.
 * 2. Gatekeeper for private areas. This only checks that a session cookie
 *    exists — the real role check happens in the page/action with
 *    requireRole(), because middleware runs on the edge without database
 *    access. Cheap first line, strict second line.
 */

const LOCK_PATH = "/se-shpejti";

const PROTECTED = ["/llogaria", "/pro", "/admin", "/kerkesa-e-re"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- Gate 1: site lock ----------------------------------------------
  const password = process.env.ZGJOI_PASSWORD;

  if (password) {
    const unlocked = req.cookies.get("zgjoi_preview")?.value === password;

    if (!unlocked) {
      // Locked visitors only get the lock page and the unlock endpoint.
      if (pathname === LOCK_PATH || pathname === "/api/hyrje") {
        return NextResponse.next();
      }
      // Everything else renders the coming-soon page, URL unchanged.
      return NextResponse.rewrite(new URL(LOCK_PATH, req.url));
    }

    // Already unlocked — don't show the lock page again.
    if (pathname === LOCK_PATH) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // ---- Gate 2: session gatekeeper (unchanged) --------------------------
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
    /* everything except static assets and files in /public */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff|woff2)).*)",
  ],
};
