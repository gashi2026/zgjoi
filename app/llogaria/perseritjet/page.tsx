import { pageGuard } from "@/lib/server/guard";
import Frame from "@/components/marketplace/Frame";
import SeriesList from "@/components/marketplace/SeriesList";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await pageGuard("CLIENT");
  return (
    <Frame actor={actor} title="Rezervimet e përsëritura" subtitle="Pastrim, dado, elektricist ose mjeshtër uji në të njëjtën ditë dhe orë, pa e rezervuar çdo herë.">
      <SeriesList actor={actor} />
    </Frame>
  );
}
