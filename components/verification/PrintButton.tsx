"use client";
import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";

/** Opens the browser print dialog (Save as PDF). With auto, prints once on load. */
export function PrintButton({ auto = false }: { auto?: boolean }) {
  const t = useT();
  useEffect(() => { if (auto) setTimeout(() => window.print(), 300); }, [auto]);
  return (
    <button type="button" onClick={() => window.print()} className="print:hidden inline-flex min-h-11 items-center rounded-full bg-gold px-5 font-semibold text-ink hover:bg-gold-dark">
      {t("printButton.printSavePdf")}</button>
  );
}
