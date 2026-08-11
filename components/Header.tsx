"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGrid, LogOut, Menu, X } from "lucide-react";
import { Logo } from "./Brand";

const links = [
  { href: "/#si-funksionon", label: "Si funksionon" },
  { href: "/profesionistet", label: "Për profesionistët" },
  { href: "/rreth-nesh", label: "Rreth nesh" },
];

type Me = { name: string; role: "CLIENT" | "PRO" | "ADMIN" | "SUPPORT" } | null;

const dashboardFor = (role: string) =>
  role === "ADMIN" || role === "SUPPORT" ? "/admin" : role === "PRO" ? "/pro/paneli" : "/llogaria";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me>(null);
  const [checked, setChecked] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // who is logged in? re-checked on every route change so login/logout reflects
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
      .then((d) => { if (alive) { setMe(d.user); setChecked(true); } })
      .catch(() => { if (alive) setChecked(true); });
    return () => { alive = false; };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/");
    router.refresh();
  }

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
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {logoUrl ? (
          <a href="/" aria-label="Zgjoi — kryefaqja">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Zgjoi" className="h-9 w-auto" />
          </a>
        ) : (
          <Logo />
        )}

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Kryesore">
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

        <div className="hidden items-center gap-3 lg:flex">{authArea}</div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Mbyll menunë" : "Hap menunë"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-white lg:hidden">
          <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-4 py-3.5 text-base font-medium transition-colors ${
                  pathname === l.href ? "bg-honey text-ink" : "text-ink hover:bg-cream"
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
                    className="rounded-full border border-gold px-5 py-3 text-center text-base font-semibold text-gold-dark transition-colors hover:bg-honey"
                  >
                    Bëhu profesionist
                  </Link>
                  <Link
                    href="/hyr"
                    className="rounded-full border border-line px-5 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-cream"
                  >
                    Hyr
                  </Link>
                  <Link
                    href="/regjistrohu"
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
    </header>
  );
}
