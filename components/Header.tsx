"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Brand";

const links = [
  /* anchors to the steps section on the home page */
  { href: "/#si-funksionon", label: "Si funksionon" },
  { href: "/profesionistet", label: "Për profesionistët" },
  { href: "/rreth-nesh", label: "Rreth nesh" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop nav */}
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

        <div className="hidden items-center gap-3 lg:flex">
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
        </div>

        {/* Mobile hamburger */}
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

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-white lg:hidden">
          <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
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
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
