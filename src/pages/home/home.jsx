
import Hero from "../../components/Hero";
import Stats from "../../components/Stats";
import Features from "../../components/Features";
import HowItWorks from "../../components/HowItWorks";
import WhyChoose from "../../components/WhyChoose";
import Workflow from "../../components/Workflow";
import Testimonials from "../../components/Testimonials";
import FAQ from "../../components/FAQ";
import CTA from "../../components/CTA";

export default function Home() {
  

  return (
    <>
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <WhyChoose />
        <Workflow />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
    </>
  );
}
