import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { FadeIn } from "../ui/FadeIn";
import { ArrowRight, Check } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 lg:py-28 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-6 tracking-tight">
            Ready to replace the diary?
          </h2>
          <p className="text-lg text-text-secondary mb-10 leading-relaxed max-w-2xl mx-auto">
            Join pharma sub-wholesalers who have already digitized their business.
            Setup takes one day. Results start immediately.
          </p>

          <Link to="/login">
            <Button size="lg" className="gap-2 px-10 text-base">
              Get Started Free <ArrowRight size={16} />
            </Button>
          </Link>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
            {["No credit card required", "Free 60-day trial", "Personal onboarding"].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm text-text-muted">
                <Check size={14} className="text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
