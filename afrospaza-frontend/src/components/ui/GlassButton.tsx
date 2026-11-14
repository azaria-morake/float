import React from "react";
import { cn } from "@/lib/cn";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "xrpl";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export function GlassButton({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  disabled,
  ...props
}: GlassButtonProps) {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm rounded-xl gap-2",
    lg: "px-6 py-3 text-base rounded-xl gap-2.5",
  }[size];

  const variantStyles = {
    primary:
      "bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm border border-emerald-600/30",
    secondary:
      "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 font-semibold",
    danger:
      "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-transparent",
    xrpl: "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold",
  }[variant];

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        sizeStyles,
        variantStyles,
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
