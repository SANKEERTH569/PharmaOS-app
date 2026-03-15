import React from "react";
import { cn } from "../../../utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "gold" | "blue" | "gray" | "accent";
}

export function Badge({ className, variant = "blue", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        {
          "bg-amber-50 text-amber-700 border border-amber-200": variant === "gold",
          "bg-primary-light text-primary border border-primary-muted/50": variant === "blue",
          "bg-surface-alt text-text-secondary border border-border": variant === "gray",
          "bg-sky-50 text-sky-700 border border-sky-200": variant === "accent",
        },
        className
      )}
      {...props}
    />
  );
}
