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
      <div className="home-scale">
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
