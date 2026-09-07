import { NextResponse, type NextRequest } from "next/server";
import { equalSecret, previewCookie } from "./lib/server/tokens";

/**
 * Two gates, in order.
 *
 * 1. Site lock — while ZGJOI_PASSWORD is set in Vercel, the whole site
 *    shows the coming-soon page. Delete the variable to go public.
 * 2. Gatekeeper for private areas. This only checks that a session cookie
 *    exists — the real role check happens in the page/action with
 *    requireRole(). Cookie presence alone does not validate a session;
 *    every private page and action must also enforce authorization.
 */

const LOCK_PATH = "/se-shpejti";

const PROTECTED = ["/llogaria", "/pro", "/admin", "/kerkesa-e-re"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Provider signatures and worker bearer tokens are checked by their handlers.
  if (
    [
      "/api/stripe/webhook",
      "/api/cron/escrow",
      "/robots.txt",
      "/sitemap.xml",
    ].includes(pathname)
  )
    return NextResponse.next();

  // ---- Gate 1: site lock ----------------------------------------------
  const password = process.env.ZGJOI_PASSWORD;

  if (password) {
    const unlocked = equalSecret(
      req.cookies.get("zgjoi_preview")?.value ?? "",
      previewCookie(password),
    );

    if (!unlocked) {
      // Locked visitors only get the lock page and the unlock endpoint.
      if (pathname === LOCK_PATH || pathname === "/api/hyrje") {
        return NextResponse.next();
      }
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { ok: false, message: "Zgjoi është në përgatitje." },
          { status: 423, headers: { "Cache-Control": "no-store" } },
        );
      }
      // Public landing remains available while the marketplace is closed.
      return NextResponse.rewrite(new URL(LOCK_PATH, req.url));
    }

    // Already unlocked — don't show the lock page again.
    if (pathname === LOCK_PATH) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // ---- Gate 2: session gatekeeper (unchanged) --------------------------
  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
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
