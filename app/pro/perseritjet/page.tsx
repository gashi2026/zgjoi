import { pageGuard } from "@/lib/server/guard";
import Frame from "@/components/marketplace/Frame";
import SeriesList from "@/components/marketplace/SeriesList";
import { getT } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const t = await getT();
  const actor = await pageGuard("PRO");
  return (
    <Frame actor={actor} title={t("pro.recurringBookings")} subtitle={t("pro.customersWhoBookRegularly")}>
      <SeriesList actor={actor} />
    </Frame>
  );
}
