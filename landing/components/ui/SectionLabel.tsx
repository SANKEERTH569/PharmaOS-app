import React from "react";
import { cn } from "../../../utils/cn";

interface SectionLabelProps extends React.HTMLAttributes<HTMLDivElement> { }

export function SectionLabel({ className, children, ...props }: SectionLabelProps) {
  return (
    <div
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
