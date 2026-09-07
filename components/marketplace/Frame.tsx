import AccountShell from "@/components/AccountShell";
import { clientNav, proNav, adminNav } from "@/lib/nav";
import type { Actor } from "@/lib/server/auth";
import { initials } from "@/lib/server/catalog";
export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
      {children}
    </section>
  );
}
export default function Frame({
  actor,
  title,
  children,
  subtitle,
}: {
  actor: Actor;
  title: string;
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <AccountShell
      title={title}
      subtitle={subtitle}
      nav={
        actor.role === "PRO"
          ? proNav
          : actor.role === "CLIENT"
            ? clientNav
            : actor.role === "SUPPORT"
              ? adminNav.filter((item) => item.href === "/admin/mbeshtetja")
              : adminNav
      }
      user={{
        name: actor.name,
        initials: initials(actor.name),
        hue: 42,
        caption:
          actor.role === "PRO"
            ? "Profesionist"
            : actor.role === "CLIENT"
              ? "Klient"
              : "Administrim",
      }}
    >
      <div className="space-y-6 pb-16">{children}</div>
    </AccountShell>
  );
}
