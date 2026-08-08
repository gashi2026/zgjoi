import type { Metadata } from "next";
import RequestWizard from "@/components/RequestWizard";

export const metadata: Metadata = {
  title: "Kërkesë e re — Zgjoi",
  description: "Përshkruaj punën që të duhet dhe merr oferta nga profesionistë të verifikuar.",
};

export default function NewRequestPage() {
  return <RequestWizard />;
}
