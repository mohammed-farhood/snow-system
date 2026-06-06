import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  sub?: string;
}

export function StatCard({
  label,
  value,
  change,
  icon,
  className,
  valueClassName,
  sub,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0;

  return (
    <div
      className={cn(
        "bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-muted)] font-medium mb-1 text-right">
            {label}
          </p>
          <p
            className={cn(
              "text-2xl font-bold text-[var(--text)] text-right truncate",
              valueClassName
            )}
          >
            {value}
          </p>
          {sub && (
            <p className="text-xs text-[var(--text-muted)] mt-1 text-right">{sub}</p>
          )}
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-xs font-semibold justify-end",
                isPositive && "text-[var(--success)]",
                isNegative && "text-[var(--error)]",
                isNeutral && "text-[var(--text-muted)]"
              )}
            >
              {isPositive && <TrendingUp size={12} />}
              {isNegative && <TrendingDown size={12} />}
              {isNeutral && <Minus size={12} />}
              <span>
                {isPositive ? "+" : ""}
                {change}%
              </span>
              <span className="text-[var(--text-muted)] font-normal">من الفترة السابقة</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
