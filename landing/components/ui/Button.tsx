import React from "react";
import { cn } from "../../../utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          {
            "bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-md active:scale-[0.98]": variant === "primary",
            "bg-text-primary text-white hover:bg-slate-800 shadow-sm active:scale-[0.98]": variant === "secondary",
            "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-alt": variant === "ghost",
            "border border-border bg-white text-text-primary hover:bg-surface hover:border-border-light": variant === "outline",
            "h-9 px-4 text-sm": size === "sm",
            "h-11 px-6 text-sm": size === "md",
            "h-12 px-8 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
