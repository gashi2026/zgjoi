import type { Metadata } from "next";
import { Suspense } from "react";
import SearchResults from "@/components/SearchResults";

export const metadata: Metadata = {
  title: "Kërko profesionistë — Zgjoi",
  description:
    "Kërko dhe filtro profesionistë të verifikuar në gjithë Kosovën sipas kategorisë, qytetit, vlerësimit dhe çmimit.",
};

export default function KerkoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-cream">
          <p className="text-sm text-muted">Duke ngarkuar kërkimin...</p>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
