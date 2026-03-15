import React, { useEffect, useRef, useState } from "react";
import { FadeIn } from "../ui/FadeIn";

function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const [count, setCount] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const numericPart = target.replace(/[^0-9]/g, "");
          const prefix = target.replace(/[0-9+]/g, "").replace(suffix, "");
          const end = parseInt(numericPart);
          const duration = 1500;
          const steps = 50;
          const increment = end / steps;
          let current = 0;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            current = Math.min(Math.round(increment * step), end);
            setCount(prefix + current.toLocaleString("en-IN"));
            if (step >= steps) {
              clearInterval(timer);
              setCount(target);
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, suffix]);

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
      {count}{suffix}
    </div>
  );
}

export function StatsSection() {
  const stats = [
    { value: "2", suffix: " min", label: "Order placement time (vs 15 min phone calls)" },
    { value: "100", suffix: "%", label: "GST filing automation" },
    { value: "200", suffix: "+", label: "Retailers per network" },
    { value: "₹50", suffix: "L+", label: "Average monthly orders managed" },
  ];

  return (
    <section className="py-16 lg:py-20 bg-surface border-y border-border px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <FadeIn key={index} delay={index * 0.08}>
              <div className="text-center">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                <p className="text-sm text-text-muted mt-2">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
