import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import { termsDocument } from "@/lib/legal/documents";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> =>
  pageMetadata({ title: "meta.termsTitle", description: "meta.termsDescription" });

export default function Page() {
  return <LegalDocument document={termsDocument} />;
}
