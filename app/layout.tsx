import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FooterSwitch from "@/components/homepage/FooterSwitch";
import MobileBottomNav from "@/components/MobileBottomNav";
import SupportChat from "@/components/SupportChat";
import { getLocale, getT, pageMetadata } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { clientCatalog, clientDictionary } from "@/lib/i18n/dictionaries";
import { CLIENT_NAMESPACES } from "@/lib/i18n/client-namespaces";
import { HTML_LANG } from "@/lib/i18n/config";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const base = await pageMetadata({ title: "meta.homeTitle", description: "meta.homeDescription" });
  return {
    ...base,
    metadataBase: new URL("https://zgjoi.com"),
    robots:
      process.env.ZGJOI_PASSWORD || process.env.VERCEL_ENV === "preview"
        ? { index: false, follow: false }
        : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <html lang={HTML_LANG[locale]} className={jakarta.variable}>
      <body className="font-sans">
        <I18nProvider locale={locale} messages={clientDictionary(locale, CLIENT_NAMESPACES)} catalog={clientCatalog(locale)}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:block focus:p-4"
        >
          {t("meta.skipToContent")}</a>
        <Header productionHome={process.env.VERCEL_ENV === "preview"} />
        <main id="main-content" className="min-h-[60vh]">
          {children}
        </main>
        <FooterSwitch enabled={process.env.VERCEL_ENV === "preview"}>
          <Footer />
        </FooterSwitch>
        <MobileBottomNav />
        <SupportChat productionHome={process.env.VERCEL_ENV === "preview"} />
        </I18nProvider>
      </body>
    </html>
  );
}
