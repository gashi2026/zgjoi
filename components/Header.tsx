"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, LogOut, Menu, X } from "lucide-react";
import { Logo } from "./Brand";

const links = [
  { href: "/#si-funksionon", label: "Si funksionon" },
  { href: "/profesionistet", label: "Për profesionistët" },
  { href: "/rreth-nesh", label: "Rreth nesh" },
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

export default function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<Me>(null);
  const [checked, setChecked] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

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
    const desktop = window.matchMedia("(min-width: 1280px)");
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
  }, [open]);

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
      window.alert("Dalja nuk u konfirmua. Provoni përsëri.");
    }
  }

  const brand = logoUrl ? (
    <Link href="/" aria-label="Zgjoi — kryefaqja">
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
        Paneli im
      </Link>
      <button
        type="button"
        onClick={logout}
        aria-label="Dil nga llogaria"
        title="Dil"
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
        Bëhu profesionist
      </Link>
      <Link
        href="/hyr"
        className="rounded-full px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-cream"
      >
        Hyr
      </Link>
      <Link
        href="/regjistrohu"
        className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition-all hover:bg-gold-dark hover:shadow-lift"
      >
        Regjistrohu
      </Link>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {brand}

          <nav
            className="hidden items-center gap-6 xl:flex"
            aria-label="Kryesore"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors hover:text-gold-dark ${
                  pathname === l.href ? "text-gold-dark" : "text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">{authArea}</div>

          <button
            type="button"
            ref={menuButton}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Mbyll menunë" : "Hap menunë"}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* The drawer lives OUTSIDE the header: a blurred element becomes the
          containing block for fixed children, which would trap it inside the
          64px bar. As a sibling it covers the screen properly. */}
      {open && (
        <div
          id="mobile-menu" ref={drawer} role="dialog" aria-modal="true" aria-label="Menuja kryesore"
          className="fixed inset-0 z-[70] overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)] xl:hidden"
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <span className="font-bold text-ink">Menuja</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Mbyll menunë" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream"><X size={24} /></button>
          </div>
          <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
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
                {l.label}
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
                    Paneli im
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full border border-line px-5 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-cream"
                  >
                    Dil nga llogaria
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/regjistrohu-profesionist"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-gold px-5 py-3 text-center text-base font-semibold text-gold-dark transition-colors hover:bg-honey"
                  >
                    Bëhu profesionist
                  </Link>
                  <Link
                    href="/hyr"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-line px-5 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-cream"
                  >
                    Hyr
                  </Link>
                  <Link
                    href="/regjistrohu"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-gold px-5 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-gold-dark"
                  >
                    Regjistrohu
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
