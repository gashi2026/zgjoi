"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Inbox, Briefcase, Wallet, UserRound, MessageSquare,
  Heart, Settings, CalendarDays, FileText, Users, Receipt,
  ShieldAlert, Headset, Layers, Target, type LucideIcon,
} from "lucide-react";
import { Avatar } from "./Brand";

const navIcons: Record<string, LucideIcon> = {
  layoutGrid: LayoutGrid, inbox: Inbox, briefcase: Briefcase,
  wallet: Wallet, userRound: UserRound, messageSquare: MessageSquare,
  heart: Heart, settings: Settings, calendarDays: CalendarDays,
  fileText: FileText, users: Users, receipt: Receipt,
  shieldAlert: ShieldAlert, headset: Headset, layers: Layers, target: Target,
};

export type NavItem = { href: string; label: string; icon: string };

export default function AccountShell({
  title,
  subtitle,
  nav,
  user,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  user: { name: string; initials: string; hue: number; caption: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[248px_1fr]">
          {/* Sidebar */}
          <aside>
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft">
              <Avatar initials={user.initials} hue={user.hue} size={48} />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted">{user.caption}</p>
              </div>
            </div>

            <nav
              className="mt-4 flex gap-2 overflow-x-auto no-scrollbar lg:flex-col"
              aria-label="Llogaria"
            >
              {nav.map(({ href, label, icon }) => {
                const Icon = navIcons[icon];
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? "border-gold bg-honey text-ink"
                        : "border-line bg-white text-muted hover:border-gold hover:text-gold-dark"
                    }`}
                  >
                    {Icon ? <Icon size={17} strokeWidth={2} /> : null}
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div>
            <header className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-sm text-muted sm:text-base">{subtitle}</p>
              )}
            </header>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
