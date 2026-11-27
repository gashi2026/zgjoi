import { pageGuard } from "@/lib/server/guard";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { serviceCategories } from "@/lib/service-categories";
import { categoryCommissionRates } from "@/lib/commission-policy";
import { getT } from "@/lib/i18n/server";

export default async function CommissionPage() {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  return <Frame actor={actor} title={t("admin.commissionCategory")}>
    <Panel>
      <p className="mb-4">{t("admin.rateLockedWhenCustomer")}</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">{t("admin.commissionRatesZgjois14")}</caption>
        <thead><tr><th className="p-3">{t("admin.category")}</th><th className="p-3">{t("admin.standard")}</th><th className="p-3">{t("admin.elite")}</th><th className="p-3">{t("admin.recurring")}</th></tr></thead>
        <tbody>{serviceCategories.map(c => <tr className="border-t border-line" key={c.slug}>
          <th scope="row" className="p-3 font-medium">{t.tx(c.name)}</th>
          <td className="p-3">{categoryCommissionRates[c.slug].standard / 100}%</td>
          <td className="p-3">{categoryCommissionRates[c.slug].elite / 100}%</td>
          <td className="p-3">{categoryCommissionRates[c.slug].recurring / 100}%</td>
        </tr>)}</tbody>
      </table></div>
    </Panel>
    <Panel><h2 className="mb-3 font-bold">{t("admin.eligibility")}</h2>
      <p>{t("admin.eliteTop5Pros")}</p>
      <p className="mt-3">{t("admin.recurringVisits5Takes")}</p>
      <p className="mt-3">{t("admin.paymentsStillTestMode")}</p>
    </Panel>
  </Frame>;
}
