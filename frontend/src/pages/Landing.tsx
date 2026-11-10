import { Hero } from '@/components/Hero';
import { ScrollStory } from '@/components/ScrollStory';
import { SignalsMarquee } from '@/components/SignalsMarquee';
import { DeveloperSection } from '@/components/DeveloperSection';
import { ComparisonSection } from '@/components/ComparisonSection';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';

export function Landing() {
  return (
    <main>
      <Hero />
      <div id="how-it-works">
        <ScrollStory />
      </div>
      <SignalsMarquee />
      <div id="developer">
        <DeveloperSection />
      </div>
      <ComparisonSection />
      <div id="faq">
        <FAQ />
      </div>
      <Footer />
    </main>
  );
}
