import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ children, className, title, action, noPadding = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--surface)] border border-[var(--border)] rounded-lg",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          {title && (
            <h3 className="font-bold text-[var(--text)] text-base">{title}</h3>
          )}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-4")}>{children}</div>
    </div>
  );
}

interface CardStatProps {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}

export function CardStat({ label, value, sub, className }: CardStatProps) {
  return (
    <div className={cn("text-right", className)}>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="text-2xl font-bold text-[var(--text)] mt-1">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}
