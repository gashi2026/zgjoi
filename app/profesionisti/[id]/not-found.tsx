import Link from "@/components/i18n/Link";
import { SearchX } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-cream px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey">
        <SearchX size={28} className="text-gold-dark" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold text-ink">
        {t("proProfile.proNotFound")}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {t("proProfile.profileDoesntExistHas")}</p>
      <Link
        href="/kerko"
        className="mt-6 rounded-full bg-gold px-7 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark"
      >
        {t("proProfile.searchPros")}</Link>
    </div>
  );
}
