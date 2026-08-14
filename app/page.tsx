import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Categories from "@/components/Categories";
import DualCards from "@/components/DualCards";
import WhyZgjoi from "@/components/WhyZgjoi";
import HowItWorks from "@/components/HowItWorks";
import CTABanner from "@/components/CTABanner";
import RecommendedPros from "@/components/RecommendedPros";
import Testimonials from "@/components/Testimonials";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      {/* Everything from "Kategoritë kryesore" down renders a touch smaller
          so the page feels lighter and more of it fits on screen. */}
      <div className="home-compact">
        <Categories />
        <DualCards />
        <WhyZgjoi />
        <HowItWorks />
        <CTABanner />
        <RecommendedPros />
        <Testimonials />
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
