"use client";
import { useT } from "@/lib/i18n/client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="text-2xl font-bold">{t("home.pageDidntLoad")}</h1>
      <p className="text-muted">
        {t("home.serviceIsntAvailableRight")}</p>
      <button
        onClick={reset}
        className="rounded-full bg-gold px-5 py-3 font-semibold"
      >
        {t("home.tryAgain")}</button>
    </div>
  );
}
