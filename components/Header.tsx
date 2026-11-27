"use client";
import { msgKey } from "@/lib/i18n/translate";

import Link from "@/components/i18n/Link";
import { useBarePathname as usePathname, useRouter } from "@/lib/i18n/client";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, LogOut, Menu, X } from "lucide-react";
import { Logo } from "./Brand";
import LanguageSwitcher from "./i18n/LanguageSwitcher";
import { useT } from "@/lib/i18n/client";

const links = [
  { href: "/#si-funksionon", label: msgKey("header.howWorks") },
  { href: "/profesionistet", label: msgKey("header.pros") },
  { href: "/rreth-nesh", label: msgKey("header.aboutUs") },
];

type Me = { name: string; role: "CLIENT" | "PRO" | "ADMIN" | "SUPPORT" } | null;

const dashboardFor = (role: string) =>
  role === "SUPPORT"
    ? "/admin/mbeshtetja"
    : role === "ADMIN"
      ? "/admin"
      : role === "PRO"
        ? "/pro/paneli"
        : "/llogaria";

export default function Header({ productionHome = false }: { productionHome?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<Me>(null);
  const [checked, setChecked] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const referenceHome = productionHome && (pathname === "/" || pathname === "/se-shpejti");

  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = menuButton.current;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const desktop = window.matchMedia(referenceHome ? "(min-width: 1024px)" : "(min-width: 1280px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab") return;
      const elements = drawer.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    desktop.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [open, referenceHome]);

  useEffect(() => {
    fetch("/api/site", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLogoUrl(d.logoUrl))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive) {
          setMe(d.user ?? null);
          setChecked(true);
        }
      })
      .catch(() => {
        if (alive) setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  async function logout() {
    setOpen(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout not confirmed");
      setMe(null);
      router.push("/");
      router.refresh();
    } catch {
      window.alert(t("header.loggingOutWasntConfirmed"));
    }
  }

  const brand = logoUrl && !referenceHome ? (
    <Link href="/" aria-label={t("common.homeAria")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt="Zgjoi" className="h-9 w-auto max-w-40 object-contain sm:max-w-48" />
    </Link>
  ) : (
    <Logo />
  );

  const authArea = !checked ? (
    <span className="h-10 w-40" aria-hidden="true" />
  ) : me ? (
    <>
      <Link
        href={dashboardFor(me.role)}
        className="flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition-all hover:bg-gold-dark hover:shadow-lift"
      >
        <LayoutGrid size={16} />
        {t("header.myDashboard")}</Link>
      <button
        type="button"
        onClick={logout}
        aria-label={t("header.logOutAccount")}
        title={t("header.logOut")}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold hover:text-gold-dark"
      >
        <LogOut size={16} />
      </button>
    </>
  ) : (
    <>
      <Link
        href="/regjistrohu-profesionist"
        className="rounded-full border border-gold px-4 py-2 text-sm font-semibold text-gold-dark transition-colors hover:bg-honey"
      >
        {t("header.becomePro")}</Link>
      <Link
        href="/hyr"
        className="rounded-full px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-cream"
      >
        {t("header.log")}</Link>
      <Link
        href="/regjistrohu"
        className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition-all hover:bg-gold-dark hover:shadow-lift"
      >
        {t("header.signUp")}</Link>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {brand}

          <nav
            className={referenceHome ? "hidden items-center gap-7 lg:flex" : "hidden items-center gap-6 xl:flex"}
            aria-label={t("header.home")}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors hover:text-gold-dark ${
                  pathname === l.href ? "text-gold-dark" : "text-ink"
                }`}
              >
                {t(l.label)}
              </Link>
            ))}
          </nav>

          <div className={referenceHome ? "hidden items-center gap-3 lg:flex" : "hidden items-center gap-3 xl:flex"}><LanguageSwitcher />{authArea}</div>

          <div className={`flex items-center gap-2 ${referenceHome ? "lg:hidden" : "xl:hidden"}`}>
          <LanguageSwitcher />
          <button
            type="button"
            ref={menuButton}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("header.closeMenu") : t("header.openMenu")}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
          </div>
        </div>
      </header>

      {/* The drawer lives OUTSIDE the header: a blurred element becomes the
          containing block for fixed children, which would trap it inside the
          64px bar. As a sibling it covers the screen properly. */}
      {open && (
        <div
          id="mobile-menu" ref={drawer} role="dialog" aria-modal="true" aria-label={t("header.mainMenu")}
          className={`fixed inset-0 z-[70] overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)] ${referenceHome ? "lg:hidden" : "xl:hidden"}`}
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <span className="font-bold text-ink">{t("header.menu")}</span>
            <LanguageSwitcher className="ml-auto mr-2" />
            <button type="button" onClick={() => setOpen(false)} aria-label={t("header.closeMenu")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream"><X size={24} /></button>
          </div>
          <nav className="flex flex-col gap-1 p-4" aria-label={t("common.mobileNav")}>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3.5 text-base font-medium transition-colors ${
                  pathname === l.href
                    ? "bg-honey text-ink"
                    : "text-ink hover:bg-cream"
                }`}
              >
                {t(l.label)}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              {me ? (
                <>
                  <Link
                    href={dashboardFor(me.role)}
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-gold px-5 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-gold-dark"
                  >
                    {t("header.myDashboard")}</Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full border border-line px-5 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-cream"
                  >
                    {t("header.logOutAccount")}</button>
                </>
              ) : (
                <>
                  <Link
                    href="/regjistrohu-profesionist"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-gold px-5 py-3 text-center text-base font-semibold text-gold-dark transition-colors hover:bg-honey"
                  >
                    {t("header.becomePro")}</Link>
                  <Link
                    href="/hyr"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-line px-5 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-cream"
                  >
                    {t("header.log")}</Link>
                  <Link
                    href="/regjistrohu"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-gold px-5 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-gold-dark"
                  >
                    {t("header.signUp")}</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
