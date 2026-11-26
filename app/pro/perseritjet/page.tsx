import { pageGuard } from "@/lib/server/guard";
import Frame from "@/components/marketplace/Frame";
import SeriesList from "@/components/marketplace/SeriesList";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await pageGuard("PRO");
  return (
    <Frame actor={actor} title="Rezervimet e përsëritura" subtitle="Klientët që ju rezervojnë rregullisht. Çdo vizitë shfaqet si rezervim në bisedë dhe në kalendar.">
      <SeriesList actor={actor} />
    </Frame>
  );
}
