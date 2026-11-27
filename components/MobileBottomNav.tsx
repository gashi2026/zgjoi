"use client";

import Link from "@/components/i18n/Link";
import { useBarePathname as usePathname } from "@/lib/i18n/client";
import { useEffect, useState } from "react";
import {
  Headset,
  LayoutGrid,
  MessageSquare,
  UserRound,
  Users,
} from "lucide-react";
import { useT } from "@/lib/i18n/client";

type Me = { name: string; role: "CLIENT" | "PRO" | "ADMIN" | "SUPPORT" } | null;

/* The bar belongs to the account areas only. Public marketing pages —
   the homepage above all — never show it, logged in or not. */
const ACCOUNT_PREFIXES = ["/llogaria", "/pro", "/admin"];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const onAccountPage = ACCOUNT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!onAccountPage) return null;
  return <AccountBottomNav key={pathname} pathname={pathname} />;
}

function AccountBottomNav({ pathname }: { pathname: string }) {
  const t = useT();
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setMe(d.user ?? null);
      })
      .catch(() => {
        if (alive) setMe(null);
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  if (!me) return null;

  const items =
    me.role === "SUPPORT"
      ? [{ href: "/admin/mbeshtetja", label: t("mobileBottomNav.support"), icon: Headset }]
      : me.role === "ADMIN"
        ? [
            { href: "/admin", label: t("mobileBottomNav.dashboard"), icon: LayoutGrid },
            { href: "/admin/mbeshtetja", label: t("mobileBottomNav.support"), icon: Headset },
            { href: "/admin/perdoruesit", label: t("mobileBottomNav.users"), icon: Users },
          ]
        : me.role === "PRO"
          ? [
              { href: "/pro/kerkesat", label: t("mobileBottomNav.chats"), icon: MessageSquare },
              { href: "/pro/paneli", label: t("mobileBottomNav.myJobs"), icon: LayoutGrid },
              { href: "/pro/profili", label: t("mobileBottomNav.profile"), icon: UserRound },
            ]
          : [
              {
                href: "/llogaria/kerkesat",
                label: t("mobileBottomNav.chats"),
                icon: MessageSquare,
              },
              { href: "/llogaria", label: t("mobileBottomNav.myJobs"), icon: LayoutGrid },
              {
                href: "/llogaria/cilesimet",
                label: t("mobileBottomNav.profile"),
                icon: UserRound,
              },
            ];

  return (
    <nav
      data-zg-bottom-nav=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label={t("mobileBottomNav.accountNavigation")}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ href, label, icon: Icon }) => {
          const exact = href === "/llogaria" || href === "/admin";
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center gap-1 px-1 py-2.5 text-xs font-semibold transition-colors ${
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
