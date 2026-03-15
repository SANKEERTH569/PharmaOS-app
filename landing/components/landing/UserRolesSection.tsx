import React from "react";
import { SectionLabel } from "../ui/SectionLabel";
import { FadeIn } from "../ui/FadeIn";
import { Building2, Store, ShoppingCart, Shield } from "lucide-react";

export function UserRolesSection() {
  const roles = [
    {
      icon: <Store className="w-6 h-6" />,
      title: "Sub-Wholesaler",
      subtitle: "Distributor / Agency",
      description: "Complete business management — orders, inventory, ledger, GST, collections, and retailer relationships.",
      features: ["Order management", "Credit ledger", "GST compliance", "Payment tracking"],
      iconBg: "bg-primary text-white",
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: "Retailer",
      subtitle: "Chemist / Medical Store",
      description: "Mobile-first marketplace to browse catalogues, place orders, track deliveries, and view outstanding balances.",
      features: ["Browse & order", "Track status", "View ledger", "Multi-agency support"],
      iconBg: "bg-emerald-500 text-white",
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Main Wholesaler",
      subtitle: "Super-Distributor / C&F",
      description: "Manage supply chain to sub-wholesalers with catalogue, supply orders, schemes, and financial tracking.",
      features: ["Supply orders", "Catalogue mgmt", "Scheme creation", "Sub-wholesaler ledger"],
      iconBg: "bg-sky-500 text-white",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Platform Admin",
      subtitle: "Pharma Head Operations",
      description: "Monitor platform health, manage plans & coupons, view analytics, and support all users.",
      features: ["User management", "Revenue analytics", "Plan upgrades", "Activity monitoring"],
      iconBg: "bg-violet-500 text-white",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-14">
            <SectionLabel className="justify-center">WHO IT'S FOR</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Built for every tier of the supply chain
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Four distinct user roles with tailored dashboards and features for each stakeholder in the pharma distribution network.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role, index) => (
            <FadeIn key={index} delay={index * 0.08}>
              <div className="group p-6 rounded-2xl bg-white border border-border hover:shadow-premium transition-all duration-300 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${role.iconBg} flex items-center justify-center`}>
                    {role.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{role.title}</h3>
                    <p className="text-sm text-text-muted">{role.subtitle}</p>
                  </div>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">{role.description}</p>
                <div className="flex flex-wrap gap-2">
                  {role.features.map((feature, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-surface text-text-primary border border-border">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
