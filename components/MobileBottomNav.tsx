"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Headset, LayoutGrid, MessageSquare, UserRound, Users } from "lucide-react";

type Me = { name: string; role: "CLIENT" | "PRO" | "ADMIN" | "SUPPORT" } | null;

/* The bar belongs to the account areas only. Public marketing pages —
   the homepage above all — never show it, logged in or not. */
const ACCOUNT_PREFIXES = ["/llogaria", "/pro", "/admin"];

export default function MobileBottomNav() {
  const [me, setMe] = useState<Me>(null);
  const pathname = usePathname();

  const onAccountPage = ACCOUNT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  useEffect(() => {
    // don't even ask who's logged in on public pages
    if (!onAccountPage) {
      setMe(null);
      return;
    }
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive) setMe(d.user ?? null); })
      .catch(() => { if (alive) setMe(null); });
    return () => { alive = false; };
  }, [pathname, onAccountPage]);

  if (!onAccountPage || !me) return null;

  const items =
    me.role === "ADMIN" || me.role === "SUPPORT"
      ? [
          { href: "/admin", label: "Paneli", icon: LayoutGrid },
          { href: "/admin/mbeshtetja", label: "Mbështetja", icon: Headset },
          { href: "/admin/perdoruesit", label: "Përdoruesit", icon: Users },
        ]
      : me.role === "PRO"
        ? [
            { href: "/pro/mesazhet", label: "Mesazhet", icon: MessageSquare },
            { href: "/pro/paneli", label: "Punët e mia", icon: LayoutGrid },
            { href: "/pro/profili", label: "Profili", icon: UserRound },
          ]
        : [
            { href: "/llogaria/mesazhet", label: "Mesazhet", icon: MessageSquare },
            { href: "/llogaria", label: "Punët e mia", icon: LayoutGrid },
            { href: "/llogaria/cilesimet", label: "Profili", icon: UserRound },
          ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navigimi i llogarisë"
    >
      <div className="grid grid-cols-3">
        {items.map(({ href, label, icon: Icon }) => {
          const exact = href === "/llogaria" || href === "/admin";
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? "text-gold-dark" : "text-muted hover:text-ink"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
