import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import { privacyDocument } from "@/lib/legal/documents";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> =>
  pageMetadata({ title: "meta.privacyTitle", description: "meta.privacyDescription" });

export default function Page() {
  return <LegalDocument document={privacyDocument} />;
}
