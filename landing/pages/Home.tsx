import React from "react";
import { HeroSection } from "../components/landing/HeroSection";
import { ProblemSection } from "../components/landing/ProblemSection";
import { SolutionSection } from "../components/landing/SolutionSection";
import { UserRolesSection } from "../components/landing/UserRolesSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { StatsSection } from "../components/landing/StatsSection";
import { TestimonialsSection } from "../components/landing/TestimonialsSection";
import { PricingSection } from "../components/landing/PricingSection";
import { CTASection } from "../components/landing/CTASection";
import { SEO } from "../components/layout/SEO";
import { FadeIn } from "../components/ui/FadeIn";

export function Home() {
  return (
    <>
      <SEO 
        title="Pharma Head — Digital Operating System for Pharma Sub-Wholesalers" 
        description="Replace your diary and phone calls with a digital platform for orders, credit ledger, and collections. Built for pharma sub-wholesalers in India."
      />
      <HeroSection />
      <FadeIn><ProblemSection /></FadeIn>
      <FadeIn><SolutionSection /></FadeIn>
      <FadeIn><UserRolesSection /></FadeIn>
      <FadeIn><FeaturesSection /></FadeIn>
      <FadeIn><HowItWorksSection /></FadeIn>
      <FadeIn><StatsSection /></FadeIn>
      <FadeIn><TestimonialsSection /></FadeIn>
      <FadeIn><PricingSection /></FadeIn>
      <FadeIn><CTASection /></FadeIn>
    </>
  );
}
