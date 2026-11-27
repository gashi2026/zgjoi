import { getT } from "@/lib/i18n/server";
export default async function Loading() {
  const t = await getT();
  return (
    <div role="status" className="mx-auto max-w-5xl px-4 py-16 text-muted">
      {t("search.loading")}</div>
  );
}
