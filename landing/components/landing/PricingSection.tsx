import React, { useState } from "react";
import { SectionLabel } from "../ui/SectionLabel";
import { Button } from "../ui/Button";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "../ui/Badge";
import { FadeIn } from "../ui/FadeIn";
import { cn } from "../../../utils/cn";
import { motion } from "motion/react";

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: "Starter",
      monthlyPrice: "₹1,499",
      yearlyPrice: "₹14,999",
      description: "For small distributors just getting started.",
      retailers: "Up to 30 retailers",
      features: [
        "Retailer marketplace & ordering",
        "Digital credit ledger",
        "Basic order management",
        "WhatsApp reminders",
        "Email support",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "outline" as const,
      isPopular: false,
    },
    {
      name: "Growth",
      monthlyPrice: "₹2,999",
      yearlyPrice: "₹27,999",
      description: "For growing businesses needing full automation.",
      retailers: "Up to 100 retailers",
      features: [
        "Everything in Starter",
        "Retailer mobile app",
        "GST compliance dashboard (GSTR-1/3B)",
        "Purchase Orders & GRN management",
        "Supply chain integration (Main Wholesaler)",
        "PDF invoices & delivery receipts",
        "Automated collections & payment tracking",
        "Real-time Socket.IO notifications",
        "Inventory management (2000+ medicines)",
        "Priority support",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "primary" as const,
      isPopular: true,
    },
    {
      name: "Enterprise",
      monthlyPrice: "₹4,999",
      yearlyPrice: "₹49,999",
      description: "Advanced tools for large-scale operations.",
      retailers: "Unlimited retailers",
      features: [
        "Everything in Growth",
        "Multi-wholesaler agency support",
        "Returns & scheme management",
        "Rack location & warehouse management",
        "Advanced analytics & reports",
        "Multi-warehouse support",
        "API access",
        "Dedicated account manager",
        "Custom integrations",
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline" as const,
      isPopular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-surface px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <SectionLabel className="justify-center">PRICING</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto mb-8">
              Choose the plan that fits your business size. No hidden fees.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-1 bg-surface-alt rounded-full p-1">
              <button
                onClick={() => setIsYearly(false)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
                  !isYearly ? "bg-white text-text-primary shadow-soft" : "text-text-muted hover:text-text-secondary"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer",
                  isYearly ? "bg-white text-text-primary shadow-soft" : "text-text-muted hover:text-text-secondary"
                )}
              >
                Yearly
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">SAVE 20%</span>
              </button>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <FadeIn key={index} delay={index * 0.08} className="h-full">
              <div
                className={cn(
                  "relative bg-white rounded-2xl p-7 border h-full flex flex-col transition-all duration-300",
                  plan.isPopular
                    ? "border-primary shadow-premium ring-1 ring-primary/10 md:scale-[1.03] z-10"
                    : "border-border hover:shadow-medium"
                )}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="blue">Most Popular</Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">{plan.name}</h3>
                  <p className="text-sm text-text-muted">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1 mb-6">
                  <motion.span
                    key={isYearly ? "y" : "m"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-bold text-text-primary"
                  >
                    {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </motion.span>
                  <span className="text-text-muted text-sm">/{isYearly ? "year" : "month"}</span>
                </div>

                <div className="bg-surface rounded-xl p-3 mb-6 text-center">
                  <p className="text-primary text-sm font-medium">{plan.retailers}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button variant={plan.buttonVariant} className="w-full mt-auto">
                  {plan.buttonText}
                </Button>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
