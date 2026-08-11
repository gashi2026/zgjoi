import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Categories from "@/components/Categories";
import DualCards from "@/components/DualCards";
import WhyZgjoi from "@/components/WhyZgjoi";
import HowItWorks from "@/components/HowItWorks";
import RecommendedPros from "@/components/RecommendedPros";
import Testimonials from "@/components/Testimonials";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Categories />
      <DualCards />
      <WhyZgjoi />
      <HowItWorks />
      <RecommendedPros />
      <Testimonials />
    </>
  );
}
