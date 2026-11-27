import { pageMetadata } from "@/lib/i18n/server";
export const generateMetadata = () => pageMetadata({ title: "meta.idVerificationTitle", robots: { index: false, follow: false } });
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
