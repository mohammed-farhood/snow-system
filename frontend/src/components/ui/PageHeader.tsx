import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 mb-6",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="text-right">
        <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
