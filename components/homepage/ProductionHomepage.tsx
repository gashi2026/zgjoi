// Preview-only reproduction of the deployed production presentation.
// Keep operational/payment wording in the current shared components.
import Hero from "./Hero";
import Stats from "./Stats";
import Categories from "./Categories";
import DualCards from "@/components/DualCards";
import WhyZgjoi from "@/components/WhyZgjoi";
import HowItWorks from "@/components/HowItWorks";
import CTABanner from "@/components/CTABanner";
import RecommendedPros from "./RecommendedPros";
import Testimonials from "./Testimonials";

export default function ProductionHomepage() {
  return (
    <>
      <div className="home-scale homepage-reference" data-homepage-reference="zgjoi.com">
        <Hero />
        <Stats />
        <div className="home-compact">
          {/* the category belt is for pointer devices — phones have the
              hex belt in the hero instead */}
          <div className="zg-pointer-block">
            <Categories />
          </div>
          <DualCards />
          <WhyZgjoi />
          <HowItWorks />
          <CTABanner />
          <RecommendedPros />
          <Testimonials />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .homepage-reference input { font-size: 0.875rem; }
            .zg-pointer-block { display: block; }
            .home-compact { zoom: 0.88; }

            /* computers: bigger page */
            @media (min-width: 641px) and (hover: hover) and (pointer: fine) {
              .home-scale { zoom: 1.25; }
            }

            /* phones and tablets — regardless of zoom level */
            @media (max-width: 640px), (hover: none) and (pointer: coarse) {
              .zg-pointer-block { display: none; }
              .home-scale { zoom: 1; }
              .home-compact { zoom: 0.92; }
            }

            @supports not (zoom: 1) {
              .home-compact { font-size: 0.9rem; }
            }
          `,
        }}
      />
    </>
  );
}
