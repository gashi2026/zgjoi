import { NextResponse, type NextRequest } from "next/server";
import { equalSecret, previewCookie } from "./lib/server/tokens";
import {
  isLocale, localizePath, stripLocale,
  LOCALE_COOKIE, LOCALE_HEADER, PATH_HEADER, type Locale,
} from "./lib/i18n/config";

/**
 * Language first, then two gates, in order.
 *
 * 0. Language — Albanian keeps the unprefixed URLs; English is served under
 *    /en/* by rewriting onto the same pages. The chosen language is passed to
 *    the app in a request header (overwriting anything the client sent) and
 *    remembered in a cookie. Unprefixed page visits from someone whose cookie
 *    says English are redirected to /en; on a first visit (no cookie) the
 *    browser's Accept-Language decides, and only an English first choice
 *    leads to English.
 *
 * 1. Site lock — while ZGJOI_PASSWORD is set in Vercel, the whole site
 *    shows the coming-soon page. Delete the variable to go public.
 * 2. Gatekeeper for private areas. This only checks that a session cookie
 *    exists — the real role check happens in the page/action with
 *    requireRole(). Cookie presence alone does not validate a session;
 *    every private page and action must also enforce authorization.
 */

const LOCK_PATH = "/se-shpejti";

const PROTECTED = ["/llogaria", "/pro", "/admin", "/kerkesa-e-re", "/verifikimi", "/regjistrohu/identiteti"];

const ONE_YEAR = 60 * 60 * 24 * 365;

export function proxy(req: NextRequest) {
  // Next.js runs the proxy again for the target of an internal rewrite
  // (/en/kerko → /kerko). The first pass already chose the language and
  // passed it on in request headers; keep it. (A client sending these headers
  // itself can only pick its own display language.)
  const forwardedLocale = req.headers.get(LOCALE_HEADER);
  const reentry = isLocale(forwardedLocale) && req.headers.has(PATH_HEADER);
  const { locale: prefixLocale, pathname } = reentry
    ? { locale: forwardedLocale, pathname: req.nextUrl.pathname }
    : stripLocale(req.nextUrl.pathname);
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const isApi = pathname.startsWith("/api/");
  const isPage = !isApi && !["/robots.txt", "/sitemap.xml"].includes(pathname);

  // Visitors who chose English, on an Albanian URL, go to the /en version
  // (GET/HEAD only, so form posts and server actions are never redirected).
  if (!reentry && isPage && !prefixLocale && ["GET", "HEAD"].includes(req.method)) {
    // Crawlers are never redirected, so both language versions stay indexable via hreflang.
    const isBot = /bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(req.headers.get("user-agent") ?? "");
    // Albanian is always the default; English only after the visitor chose it (EN switch or an /en link).
    const wanted: Locale = !isBot && isLocale(cookieLocale) ? cookieLocale : "sq";
    if (wanted === "en") {
      const url = req.nextUrl.clone();
      url.pathname = localizePath(pathname, "en");
      const res = NextResponse.redirect(url, 307);
      res.headers.set("Vary", "Cookie");
      return res;
    }
  }
  const locale: Locale = prefixLocale ?? (isPage ? "sq" : isLocale(cookieLocale) ? cookieLocale : "sq");
  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  if (!reentry) headers.set(PATH_HEADER, pathname);
  const finish = (res: NextResponse) => {
    if (!reentry && isPage && cookieLocale !== locale && !/bot|crawl|spider/i.test(req.headers.get("user-agent") ?? "")) setLocaleCookie(res, locale);
    return res;
  };
  /** Continue to the page (rewriting /en/x onto /x so both languages share one route tree). */
  const pass = (target = pathname) => finish(
    (prefixLocale && !reentry) || target !== pathname
      ? NextResponse.rewrite(new URL(target + req.nextUrl.search, req.url), { request: { headers } })
      : NextResponse.next({ request: { headers } }),
  );
  const local = (path: string) => localizePath(path, locale);

  // Provider signatures and worker bearer tokens are checked by their handlers.
  if (
    [
      "/api/stripe/webhook",
      "/api/cron/escrow",
      "/api/cron/recurring",
      "/robots.txt",
      "/sitemap.xml",
    ].includes(pathname)
  )
    return pass();

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
        return pass();
      }
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { ok: false, message: locale === "en" ? "Zgjoi is getting ready to launch." : "Zgjoi është në përgatitje." },
          { status: 423, headers: { "Cache-Control": "no-store" } },
        );
      }
      // Public landing remains available while the marketplace is closed.
      return pass(LOCK_PATH);
    }

    // Already unlocked — don't show the lock page again.
    if (pathname === LOCK_PATH) {
      return NextResponse.redirect(new URL(local("/"), req.url));
    }
  }

  // ---- Gate 2: session gatekeeper (unchanged) --------------------------
  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!needsAuth) return pass();

  const hasSession = Boolean(req.cookies.get("zgjoi_session")?.value);
  if (hasSession) return pass();

  const url = req.nextUrl.clone();
  url.pathname = local("/hyr");
  url.searchParams.set("next", pathname);
  return finish(NextResponse.redirect(url));
}

function setLocaleCookie(res: NextResponse, locale: Locale) {
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

export const config = {
  matcher: [
    /* everything except static assets and files in /public */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff|woff2)).*)",
  ],
};
