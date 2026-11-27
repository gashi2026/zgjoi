import { localRedirect } from "@/lib/i18n/redirect";
import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { publicProfile } from "@/lib/server/catalog";
import { db } from "@/lib/server/db";
import { categoryFlow } from "@/lib/server/bookings";
import { money } from "@/lib/format";
import { ESTIMATE_PRO_SHARE_CENTS, ESTIMATE_PLATFORM_SHARE_CENTS } from "@/lib/book-now";
import { serviceCategory } from "@/lib/service-categories";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import { IdGate } from "@/components/verification/IdNotice";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
/** Paid estimate visit (Elektricist, Mjeshtër i Ujit): €15, credited in full
 * if the customer hires this pro by any path. Beta: Zgjoi confirms the payment. */
export default async function Page({ searchParams }: { searchParams: Promise<{ pro?: string }> }) {
  const t = await getT();
  const actor = await pageGuard("CLIENT");
  const { pro: id } = await searchParams;
  if (!id) return localRedirect("/kerko");
  const pro = await publicProfile(id);
  if (!pro) notFound();
  const flow = await categoryFlow(db, pro.categorySlug);
  if (!flow.estimate || !flow.estimatePriceCents) return localRedirect(`/kerkesa-e-re?pro=${pro.id}`);
  const price = money(flow.estimatePriceCents, t.locale);
  const open = await db.estimate.findFirst({ where: { clientId: actor.id, profileId: pro.id, state: { in: ["PENDING", "PAID"] } } });
  const category = serviceCategory(pro.categorySlug)?.name ?? pro.categorySlug;
  return (
    <Frame actor={actor} title={t("estimate.estimateVisit", { name: pro.user.name })}
      subtitle={t("estimate.proComesOverLooks", { category: category, price: price })}>
      <Panel>
        <h2 className="mb-1 text-lg font-bold">{t("estimate.howWorks")}</h2>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
          <li>{t("estimate.estimateVisitCostsPaid", { price: price })}</li>
          <li>{t("estimate.ifThenHireBook", { name: pro.user.name, price: price })}</li>
          <li>{t("estimate.zgjoisCommissionBasedFull", { price: price })}</li>
          <li>{t("estimate.ifDontHireThem", { amount: money(ESTIMATE_PRO_SHARE_CENTS, t.locale), amount2: money(ESTIMATE_PLATFORM_SHARE_CENTS, t.locale) })}</li>
        </ul>
        {open ? (
          <p className="rounded-xl bg-honey p-3 text-sm font-semibold" role="status">
            {open.state === "PAID"
              ? t("estimate.havePaidEstimateComes", { name: pro.user.name, amount: money(open.amountCents, t.locale) })
              : t("estimate.havePendingEstimateRequest", { name: pro.user.name })}{" "}
            {open.requestId && <Link className="underline" href={`/llogaria/kerkesat/${open.requestId}`}>{t("estimate.openChat")}</Link>}
          </p>
        ) : (
          <IdGate actor={actor}>
          <ApiForm endpoint="/api/estimates" idempotent values={{ profileId: pro.id }} label={t("estimate.requestEstimate", { price: price })}
            confirmation={t("estimate.requestEstimateVisitFrom", { name: pro.user.name, price: price })}
            fields={[
              { name: "visitAt", label: t("estimate.whenSuitsVisitKosovo"), type: "datetime-local", kosovoTime: true, required: true,
                hint: t("estimate.proConfirmsSuggestsAnother") },
              { name: "detail", label: t("estimate.whatNeedsLooking"), type: "textarea", required: true, minLength: 10, maxLength: 4000,
                hint: t("estimate.noPhoneNumbersEmails") },
              { name: "city", label: t("estimate.city"), value: actor.city ?? "", required: true, maxLength: 60 },
              { name: "address", label: t("estimate.address"), maxLength: 300 },
            ]} />
          </IdGate>
        )}
        <p className="mt-3 text-sm text-muted"><Link className="text-gold-dark" href={`/profesionisti/${pro.slug}`}>{t("estimate.backProfile")}</Link></p>
      </Panel>
    </Frame>
  );
}
