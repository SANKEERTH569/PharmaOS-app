import React from "react";
import { SectionLabel } from "../ui/SectionLabel";
import { FadeIn } from "../ui/FadeIn";
import { Smartphone, Wallet, LayoutDashboard, ShoppingBag, Zap } from "lucide-react";

export function SolutionSection() {
  const solutions = [
    {
      icon: <ShoppingBag className="w-6 h-6" />,
      title: "Retailer Marketplace",
      description: "Retailers browse your full catalogue, search by medicine name or salt, add to cart, and place orders with GST breakdowns — all from their phone.",
      iconBg: "bg-primary text-white",
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: "Real-Time Credit Ledger",
      description: "Every order debits and every payment credits — automatically. Double-entry ledger per retailer with full transaction history. No diary needed.",
      iconBg: "bg-emerald-500 text-white",
    },
    {
      icon: <LayoutDashboard className="w-6 h-6" />,
      title: "GST Compliance Dashboard",
      description: "Auto-generated GSTR-1, GSTR-3B, and HSN summary reports. Export-ready GST data with buyer-wise breakdowns. Filing prep in minutes, not hours.",
      iconBg: "bg-sky-500 text-white",
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Order Lifecycle Management",
      description: "Accept → Dispatch → Deliver. Generate PDF invoices and delivery receipts at each stage. Retailers see live status updates via real-time notifications.",
      iconBg: "bg-amber-500 text-white",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Multi-Tier Supply Chain",
      description: "Complete supply chain from Main Wholesaler → Sub-Wholesaler → Retailer. Purchase orders, GRNs, supply orders, and scheme management across tiers.",
      iconBg: "bg-violet-500 text-white",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-14">
            <SectionLabel className="justify-center">THE PLATFORM</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              One platform for your entire operation
            </h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((solution, index) => (
            <FadeIn key={index} delay={index * 0.08} className={index === 4 ? "sm:col-span-2 lg:col-span-1" : ""}>
              <div className="group p-6 rounded-2xl bg-white border border-border hover:shadow-premium transition-all duration-300 h-full">
                <div className={`w-12 h-12 rounded-xl ${solution.iconBg} flex items-center justify-center mb-5`}>
                  {solution.icon}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{solution.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{solution.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
