import React from "react";
import { Link } from "react-router-dom";
import { AnimatedLogo } from "../../../components/ui/AnimatedLogo";

export function Footer() {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-3">
              <AnimatedLogo size="sm" />
            </Link>
            <p className="text-sm text-text-muted leading-relaxed mb-4">
              Digital operating system for pharma sub-wholesalers in India.
            </p>
            <a href="https://leeep.dev" target="_blank" rel="noopener noreferrer" className="block mt-3 group">
              <p className="text-xs text-text-muted mb-1.5">A product of</p>
              <div className="opacity-60 group-hover:opacity-90 transition-opacity">
                <div className="text-2xl font-bold text-text-primary leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>leeep</div>
                <div className="text-sm font-light text-text-primary tracking-[0.18em] ml-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>dev</div>
              </div>
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Product</h4>
            <ul className="space-y-2.5">
              {["Features", "How It Works", "Pricing", "Request Demo"].map((item) => (
                <li key={item}>
                  <Link to={item === "Request Demo" ? "/login" : `/#${item.toLowerCase().replace(/ /g, "-")}`} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Company</h4>
            <ul className="space-y-2.5">
              {[
                { name: "About", href: "#" },
                { name: "Login", href: "/login" },
                { name: "Dashboard", href: "/app" },
                { name: "Privacy", href: "#" },
              ].map((item) => (
                <li key={item.name}>
                  <Link to={item.href} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Contact</h4>
            <ul className="space-y-2.5 text-sm text-text-muted">
              <li><a href="mailto:admin@pharmahead.app" className="hover:text-text-primary transition-colors">admin@pharmahead.app</a></li>
              <li><a href="tel:9398958886" className="hover:text-text-primary transition-colors">+91 9398958886</a></li>
              <li className="pt-1 text-text-muted/70">Mon – Sat, 9am – 6pm</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <p>© 2025 Pharma Head. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
