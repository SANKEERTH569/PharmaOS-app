import React from "react";
import { SectionLabel } from "../ui/SectionLabel";
import { FadeIn } from "../ui/FadeIn";

export function HowItWorksSection() {
  const steps = [
    { number: "1", title: "Setup", description: "We set up your account with your medicines and details" },
    { number: "2", title: "Add Retailers", description: "Add your retailers and their opening credit balances in 30 minutes" },
    { number: "3", title: "Go Live", description: "Retailers download the app and place their first order the same day" },
    { number: "4", title: "Grow", description: "Watch orders, payments and collections go digital" },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <SectionLabel className="justify-center">HOW IT WORKS</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              Up and running in one day
            </h2>
          </div>
        </FadeIn>

        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden sm:block" />

          <div className="space-y-8 sm:space-y-10">
            {steps.map((step, index) => (
              <FadeIn key={index} delay={index * 0.1}>
                <div className="flex items-start gap-6 sm:gap-8 relative">
                  <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold">
                    {step.number}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-lg font-semibold text-text-primary mb-1">{step.title}</h3>
                    <p className="text-text-secondary leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
