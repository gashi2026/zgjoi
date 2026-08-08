import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import SupportChat from "@/components/SupportChat";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zgjoi — Gjej profesionist për çdo shërbim. Lehtë.",
  description:
    "Zgjoi është platforma më e besuar në Kosovë për të gjetur dhe punësuar profesionistë lokalë: elektricistë, hidraulikë, pastrues, piktorë dhe më shumë.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sq" className={jakarta.variable}>
      <body className="font-sans">
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
        <MobileBottomNav />
        <SupportChat />
      </body>
    </html>
  );
}
