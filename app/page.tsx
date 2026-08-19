import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Categories from "@/components/Categories";
import DualCards from "@/components/DualCards";
import WhyZgjoi from "@/components/WhyZgjoi";
import HowItWorks from "@/components/HowItWorks";
import CTABanner from "@/components/CTABanner";
import RecommendedPros from "@/components/RecommendedPros";
import Testimonials from "@/components/Testimonials";
import MobileAutoScroll from "@/components/MobileAutoScroll";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <div className="home-compact">
        {/* the category belt is desktop-only — on phones the comb above
            already covers browsing by category */}
        <div className="hidden sm:block">
          <Categories />
        </div>
        <DualCards />
        <WhyZgjoi />
        <HowItWorks />
        <CTABanner />
        {/* these two belts drift on their own on phones */}
        <MobileAutoScroll>
          <RecommendedPros />
        </MobileAutoScroll>
        <MobileAutoScroll speed={22}>
          <Testimonials />
        </MobileAutoScroll>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .home-compact { zoom: 0.88; }
            @media (max-width: 640px) { .home-compact { zoom: 0.92; } }
            @supports not (zoom: 1) {
              .home-compact { font-size: 0.9rem; }
            }
          `,
        }}
      />
    </>
  );
}
