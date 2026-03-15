import React from "react";
import { SectionLabel } from "../ui/SectionLabel";
import { Star, Quote } from "lucide-react";
import { FadeIn } from "../ui/FadeIn";

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Earlier I used to spend 2 hours every morning taking orders on phone. Now my retailers place orders themselves. My whole business runs smoother.",
      author: "Ravi Kumar",
      role: "Medical Distributor",
      location: "Hyderabad",
      rating: 5,
    },
    {
      quote: "The credit ledger alone is worth it. No more arguments with retailers about what they owe. The system shows the exact amount.",
      author: "Srinivas Reddy",
      role: "Pharma Wholesale",
      location: "Vijayawada",
      rating: 5,
    },
    {
      quote: "I was skeptical about technology, but Pharma Head is so simple. My staff learned it in one day. Collections improved by 40%.",
      author: "Anil Gupta",
      role: "Gupta Pharma",
      location: "Visakhapatnam",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-14">
            <SectionLabel className="justify-center">TESTIMONIALS</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Trusted by modern distributors
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Join hundreds of sub-wholesalers who have digitized their operations.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={index} delay={index * 0.1} className="h-full">
              <div className="group bg-white rounded-2xl p-7 border border-border hover:shadow-premium transition-all duration-300 h-full flex flex-col relative">
                <Quote size={32} className="text-primary/10 mb-4" />

                <div className="flex gap-0.5 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-text-primary leading-relaxed mb-6 flex-1">
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center gap-3 pt-5 border-t border-border mt-auto">
                  <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-sm">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{testimonial.author}</p>
                    <p className="text-xs text-text-muted">{testimonial.role}, {testimonial.location}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
