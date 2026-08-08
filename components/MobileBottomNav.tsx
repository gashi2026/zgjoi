"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MessageCircle, Briefcase, User } from "lucide-react";

const items = [
  { href: "/kerko", label: "Kërko", icon: Search },
  { href: "/llogaria/mesazhet", label: "Mesazhet", icon: MessageCircle },
  { href: "/llogaria/kerkesat", label: "Punët e mia", icon: Briefcase },
  { href: "/llogaria", label: "Profili", icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden"
      aria-label="Navigimi i poshtëm"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-[11px] font-medium transition-colors ${
                active ? "text-gold-dark" : "text-muted hover:text-ink"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
