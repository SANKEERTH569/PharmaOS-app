import React from "react";
import { SectionLabel } from "../ui/SectionLabel";
import { FadeIn } from "../ui/FadeIn";
import { BookOpen, Phone, IndianRupee, BarChart3 } from "lucide-react";

export function ProblemSection() {
  const problems = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: "Manual credit diaries",
      description: "Errors, disputes, and hours wasted reconciling retailer balances every day.",
      iconBg: "bg-rose-50 text-rose-600",
    },
    {
      icon: <Phone className="w-5 h-5" />,
      title: "Orders via phone calls",
      description: "Wrong medicines, missed orders, and no record of what was actually agreed.",
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      icon: <IndianRupee className="w-5 h-5" />,
      title: "No idea who owes what",
      description: "Chasing payments without knowing balances means lost money and wasted trips.",
      iconBg: "bg-rose-50 text-rose-600",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "GST filing nightmare",
      description: "Hours spent re-entering paper invoices into GSTR-1 and GSTR-3B every month.",
      iconBg: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-surface px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        <div className="lg:sticky lg:top-28">
          <FadeIn>
            <SectionLabel>THE PROBLEM</SectionLabel>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
              Running a ₹50 lakh business
              <br className="hidden sm:block" />
              with a ₹30 diary.
            </h2>
          </FadeIn>
        </div>

        <div className="space-y-3">
          {problems.map((problem, index) => (
            <FadeIn key={index} delay={index * 0.08}>
              <div className="group flex gap-4 p-5 rounded-2xl bg-white border border-border hover:shadow-medium transition-all duration-200">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${problem.iconBg} flex items-center justify-center`}>
                  {problem.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary mb-1">{problem.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{problem.description}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
