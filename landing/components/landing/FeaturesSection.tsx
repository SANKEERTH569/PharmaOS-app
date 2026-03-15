import React, { useState } from "react";
import { SectionLabel } from "../ui/SectionLabel";
import { FadeIn } from "../ui/FadeIn";
import { CheckCircle2, CreditCard, ShoppingBag, BarChart3, FileText, Package } from "lucide-react";
import { cn } from "../../../utils/cn";
import { motion, AnimatePresence } from "motion/react";

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      icon: <ShoppingBag className="w-4 h-4" />,
      tab: "Marketplace",
      title: "Retailer Marketplace & Cart",
      description: "Retailers browse your full medicine catalogue with search by name, salt, or therapeutic class. They add to cart, see GST breakdowns, and place orders — no phone call needed.",
      bullets: [
        "2,000+ Indian medicines with full details",
        "Search by name, composition, or therapeutic class",
        "Cart with per-item GST breakdown and discount",
        "One-tap repeat previous orders",
      ],
      mockup: {
        header: "Marketplace",
        rows: [
          { name: "Paracetamol 500mg", detail: "₹120 × 50 strips", status: "emerald" },
          { name: "Amoxicillin 250mg", detail: "₹340 × 20 strips", status: "emerald" },
          { name: "Cetirizine 10mg", detail: "₹85 × 100 tabs", status: "emerald" },
        ],
        total: "₹15,300",
      },
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      tab: "Ledger",
      title: "Double-Entry Credit Ledger",
      description: "Every order auto-debits and every payment auto-credits the retailer's running balance. Full debit/credit timeline with zero manual entry.",
      bullets: [
        "Auto-updates on every order and payment",
        "Per-retailer transaction history",
        "Credit limit alerts before overdue",
        "Export ledger as PDF or CSV",
      ],
      mockup: {
        header: "Credit Ledger — Ravi Medical",
        rows: [
          { name: "Order #1042 (Debit)", detail: "+₹45,200", status: "rose" },
          { name: "UPI Payment (Credit)", detail: "-₹20,000", status: "emerald" },
          { name: "Order #1048 (Debit)", detail: "+₹12,800", status: "rose" },
        ],
        total: "Balance: ₹38,000",
      },
    },
    {
      icon: <FileText className="w-4 h-4" />,
      tab: "GST",
      title: "GST Compliance & Reports",
      description: "Auto-generated GSTR-1, GSTR-3B, and HSN summary reports from delivered orders. Export-ready data with buyer-wise tax breakdowns. GST filing prep in minutes.",
      bullets: [
        "GSTR-1 outward supplies register",
        "GSTR-3B monthly return summary",
        "HSN-wise tax summary",
        "Buyer-wise GST breakdown with PDF export",
      ],
      mockup: {
        header: "GST Dashboard — March 2026",
        rows: [
          { name: "Total Taxable Value", detail: "₹12,45,000", status: "emerald" },
          { name: "CGST (9%)", detail: "₹56,025", status: "amber" },
          { name: "SGST (9%)", detail: "₹56,025", status: "amber" },
        ],
        total: "Total Tax: ₹1,12,050",
      },
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      tab: "Supply Chain",
      title: "Multi-Tier Supply Chain",
      description: "Complete procurement workflow — create purchase orders to Main Wholesalers, receive goods with GRNs, manage supply orders, and track batch-level inventory.",
      bullets: [
        "Purchase Orders with auto-numbering",
        "Goods Receipt Notes (GRN) with batch tracking",
        "Supply order management (MW → Wholesaler)",
        "FIFO stock deduction by expiry date",
      ],
      mockup: {
        header: "Purchase Order #PO-260314-001",
        rows: [
          { name: "Sent to MW", detail: "10:30 AM", status: "emerald" },
          { name: "Partially Received", detail: "2:15 PM", status: "amber" },
          { name: "GRN Created", detail: "3:45 PM", status: "emerald" },
        ],
        total: "₹2,45,000 — 45 items",
      },
    },
    {
      icon: <Package className="w-4 h-4" />,
      tab: "Inventory",
      title: "Medicine Inventory Management",
      description: "Manage your full catalogue — add products manually or bulk-import from the bundled 2,000+ Indian medicines dataset. Track stock, MRP, GST, and expiry.",
      bullets: [
        "Bulk import from A–Z Indian medicines database",
        "Track stock levels, MRP, and GST per item",
        "Expiry date alerts and low-stock warnings",
        "Manage manufacturer, composition, and pack size",
      ],
      mockup: {
        header: "Inventory",
        rows: [
          { name: "Paracetamol 500mg", detail: "320 in stock", status: "emerald" },
          { name: "Amoxicillin 250mg", detail: "18 in stock", status: "amber" },
          { name: "Metformin 500mg", detail: "0 in stock", status: "rose" },
        ],
        total: "1,847 products listed",
      },
    },
  ];

  const statusColors: Record<string, string> = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
  };

  return (
    <section id="features" className="py-20 lg:py-28 bg-surface px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <SectionLabel className="justify-center">FEATURES</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Everything a sub-wholesaler needs
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Built to solve the specific problems of the Indian pharma supply chain.
            </p>
          </div>
        </FadeIn>

        {/* Tabs */}
        <FadeIn delay={0.05}>
          <div className="flex justify-center gap-1 mb-12 bg-surface-alt rounded-full p-1 max-w-xl mx-auto flex-wrap">
            {features.map((feature, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
                  activeTab === index
                    ? "bg-white text-text-primary shadow-soft"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                {feature.icon}
                <span className="hidden sm:inline">{feature.tab}</span>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16"
          >
            {/* Text */}
            <div className="w-full lg:w-1/2 space-y-5">
              <h3 className="text-2xl md:text-3xl font-bold text-text-primary">{features[activeTab].title}</h3>
              <p className="text-text-secondary leading-relaxed">{features[activeTab].description}</p>
              <ul className="space-y-3 pt-1">
                {features[activeTab].bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-primary font-medium">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mockup */}
            <div className="w-full lg:w-1/2">
              <div className="rounded-2xl bg-white shadow-premium border border-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface">
                  <span className="text-sm font-semibold text-text-primary">{features[activeTab].mockup.header}</span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {features[activeTab].mockup.rows.map((row, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${statusColors[row.status]}`} />
                        <span className="text-sm text-text-primary">{row.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{row.detail}</span>
                    </motion.div>
                  ))}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border px-1">
                    <span className="text-xs text-text-muted">Total</span>
                    <span className="text-base font-bold text-primary">{features[activeTab].mockup.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
