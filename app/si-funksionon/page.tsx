import type { Metadata } from "next";
import HowItWorks from "@/components/HowItWorks";
import WhyZgjoi from "@/components/WhyZgjoi";
import CTABanner from "@/components/CTABanner";

export const metadata: Metadata = {
  title: "Si funksionon — Zgjoi",
  description:
    "Kërko, krahaso, paguaj dhe vlerëso — katër hapa të thjeshtë për të gjetur profesionistin e duhur.",
};

export default function SiFunksiononPage() {
  return (
    <>
      <div className="bg-cream pt-14">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Si funksionon <span className="text-gold">Zgjoi?</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted">
            Nga kërkimi te vlerësimi — gjithçka në një vend, e thjeshtë dhe e
            sigurt.
          </p>
        </div>
      </div>
      <HowItWorks heading={false} />
      <WhyZgjoi />
      <CTABanner />
    </>
  );
}
