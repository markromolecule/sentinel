import { Header } from '@/components/common';
import { HeroSection, FeatureSection } from '@/app/(public)/landing';
import { Analytics } from "@vercel/analytics/next"

export default function Home() {
  return (
    <>
      <Analytics />
      <Header />
      <HeroSection />
      <FeatureSection />
    </>
  );
}

