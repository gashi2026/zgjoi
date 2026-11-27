import AccountShell from "@/components/AccountShell";
import { clientNav, proNav, adminNav } from "@/lib/nav";
import type { Actor } from "@/lib/server/auth";
import { initials } from "@/lib/server/catalog";
import Link from "@/components/i18n/Link";
import { IdNotice } from "@/components/verification/IdNotice";
import { canReviewIds } from "@/lib/server/id-verification";
import { getT } from "@/lib/i18n/server";
export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-w-0 break-words rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
      {children}
    </section>
  );
}
export default async function Frame({
  actor,
  title,
  children,
  subtitle,
  hideIdNotice = false,
}: {
  actor: Actor;
  title: string;
  children: React.ReactNode;
  subtitle?: string;
  hideIdNotice?: boolean;
}) {
  const t = await getT();
  // SUPPORT sees the ID queue only while the owner has granted it (checked on every render).
  const supportPages = actor.role === "SUPPORT" && (await canReviewIds(actor))
    ? ["/admin/mbeshtetja", "/admin/verifikimi"] : ["/admin/mbeshtetja"];
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
              ? adminNav.filter((item) => supportPages.includes(item.href))
              : adminNav
      }
      user={{
        name: actor.name,
        initials: initials(actor.name),
        hue: 42,
        caption:
          actor.role === "PRO"
            ? t("frame.pro")
            : actor.role === "CLIENT"
              ? t("frame.customer")
              : t("frame.admin"),
      }}
    >
      <div className="space-y-6 pb-16">
        <Link href="/siguria" className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-dark">{t("frame.accountSecurity")}</Link>
        {!hideIdNotice && <IdNotice actor={actor} />}
        {children}
      </div>
    </AccountShell>
  );
}
