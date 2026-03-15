import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { FadeIn } from "../ui/FadeIn";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
      {/* Subtle background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <FadeIn>
          <Badge variant="blue" className="mb-6">
            B2B SaaS for Pharma Distributors in India
          </Badge>
        </FadeIn>

        <FadeIn delay={0.05}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] mb-6 text-text-primary tracking-tight">
            Your entire pharma
            <br />
            business, digitized.
          </h1>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="text-lg md:text-xl text-text-secondary font-normal max-w-2xl mx-auto mb-10 leading-relaxed">
            Complete B2B SaaS platform for the Indian pharma supply chain — from retailer marketplace 
            to GST compliance, inventory management to payment tracking. Built for distributors, 
            super-stockists, and their retail networks.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-20">
            <Link to="/login">
              <Button size="lg" className="gap-2 px-8">
                Get Started Free <ArrowRight size={16} />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="px-8">
                See How It Works
              </Button>
            </a>
          </div>
        </FadeIn>

        {/* Dashboard preview */}
        <FadeIn delay={0.25} className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white shadow-premium border border-border/80 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-md px-3 py-1 text-xs text-text-muted border border-border">
                  app.pharmahead.in/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard grid */}
            <div className="p-5 bg-surface">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Today's Revenue", value: "₹2,34,500", change: "+12%", color: "text-emerald-600" },
                  { label: "Active Retailers", value: "156", sub: "3 new this week", color: "text-sky-600" },
                  { label: "Pending Orders", value: "8", sub: "₹1,42,000 value", color: "text-amber-600" },
                  { label: "Outstanding", value: "₹18,45,000", sub: "₹2.1L overdue", color: "text-rose-600" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="bg-white rounded-xl p-3 border border-border"
                  >
                    <p className="text-[10px] text-text-muted mb-1">{stat.label}</p>
                    <p className="text-base font-bold text-text-primary">{stat.value}</p>
                    <p className={`text-[10px] mt-0.5 ${stat.color}`}>{stat.change || stat.sub}</p>
                  </motion.div>
                ))}
              </div>
              {/* Recent orders */}
              <div className="space-y-2">
                {[
                  { name: "Ravi Medical Store", action: "Order #1042", value: "₹45,200", status: "Dispatched", statusColor: "text-amber-600 bg-amber-50" },
                  { name: "Sri Lakshmi Pharma", action: "Payment received", value: "₹20,000", status: "Credited", statusColor: "text-emerald-600 bg-emerald-50" },
                  { name: "Venkat Distributors", action: "Order #1045", value: "₹18,500", status: "Pending", statusColor: "text-rose-600 bg-rose-50" },
                ].map((row, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-center justify-between px-4 py-2.5 bg-white rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-[10px] font-bold text-primary">
                        {row.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm text-text-primary">{row.name}</span>
                        <p className="text-[10px] text-text-muted">{row.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-primary">{row.value}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${row.statusColor}`}>{row.status}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.35}>
          <p className="text-sm text-text-muted mt-10">
            Trusted by sub-wholesalers across Andhra Pradesh & Telangana
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
