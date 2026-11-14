import React from "react";
import { cn } from "@/lib/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "orange" | "green" | "blue" | "red" | "yellow" | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    green: "bg-emerald-50 text-emerald-800 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-amber-50 text-amber-800 border-amber-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  }[variant];

  const dotColors = {
    orange: "bg-orange-400",
    green: "bg-emerald-400",
    blue: "bg-blue-400",
    red: "bg-red-400",
    yellow: "bg-amber-400",
    neutral: "bg-zinc-400",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs",
        variantStyles,
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors)} />}
      {children}
    </span>
  );
}
