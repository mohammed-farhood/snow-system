import React from "react";
import { cn } from "@/lib/utils";
import { paymentTypeLabel, roleLabel } from "@/lib/utils";

type BadgeVariant = "success" | "error" | "warning" | "info" | "neutral" | "accent";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30",
  error: "bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  neutral: "bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]",
  accent: "bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/30",
};

export function Badge({ variant = "neutral", children, className, size = "md" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Payment Type Badge
export function PaymentBadge({ type }: { type: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    CASH: "success",
    DEBT: "error",
    PARTIAL: "warning",
    cash: "success",
    debt: "error",
    partial: "warning",
  };
  return (
    <Badge variant={variantMap[type] ?? "neutral"}>
      {paymentTypeLabel(type)}
    </Badge>
  );
}

// Role Badge
export function RoleBadge({ role }: { role: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    OWNER: "accent",
    SUPERVISOR: "info",
    WORKER: "neutral",
  };
  return (
    <Badge variant={variantMap[role] ?? "neutral"}>
      {roleLabel(role)}
    </Badge>
  );
}

// Status Badge
export function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "error"}>
      {active ? "نشط" : "غير نشط"}
    </Badge>
  );
}
