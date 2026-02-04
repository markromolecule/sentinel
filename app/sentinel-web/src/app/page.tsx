import { Header, Footer } from '@/components/common';
import { 
  HeroSection, 
  FeatureSection, 
  HowItWorksSection, 
  CompareSection,
  DownloadSection 
} from '@/app/(public)/landing';

export default function Home() {
  return (
    <>
      <Header />
      <HeroSection />
      <FeatureSection />
      <HowItWorksSection />
      <CompareSection />
      <DownloadSection />
      <Footer />
    </>
  );
}
