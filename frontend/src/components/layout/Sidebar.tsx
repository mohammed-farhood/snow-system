"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getUser, logout } from "@/lib/auth";
import { RoleBadge } from "@/components/ui/Badge";
import {
  LayoutDashboard,
  Snowflake,
  ShoppingBag,
  Package,
  Truck,
  Wallet,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Factory,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: ("OWNER" | "SUPERVISOR" | "WORKER")[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "لوحة التحكم",
    icon: <LayoutDashboard size={20} />,
    roles: ["OWNER", "SUPERVISOR"],
  },
  {
    href: "/snow/production",
    label: "الإنتاج",
    icon: <Snowflake size={20} />,
    roles: ["OWNER", "SUPERVISOR", "WORKER"],
  },
  {
    href: "/snow/sales",
    label: "مبيعات الثلج",
    icon: <ShoppingBag size={20} />,
    roles: ["OWNER", "SUPERVISOR", "WORKER"],
  },
  {
    href: "/goods",
    label: "مبيعات البضاعة",
    icon: <Package size={20} />,
    roles: ["OWNER", "SUPERVISOR", "WORKER"],
  },
  {
    href: "/purchases",
    label: "المشتريات",
    icon: <Truck size={20} />,
    roles: ["OWNER", "SUPERVISOR"],
  },
  {
    href: "/expenses",
    label: "المصاريف",
    icon: <Wallet size={20} />,
    roles: ["OWNER", "SUPERVISOR"],
  },
  {
    href: "/reports",
    label: "التقارير",
    icon: <BarChart3 size={20} />,
    roles: ["OWNER", "SUPERVISOR"],
  },
  {
    href: "/customers",
    label: "العملاء",
    icon: <Users size={20} />,
    roles: ["OWNER", "SUPERVISOR"],
  },
  {
    href: "/settings",
    label: "الإعدادات",
    icon: <Settings size={20} />,
    roles: ["OWNER"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = getUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(user.role as "OWNER" | "SUPERVISOR" | "WORKER")
  );

  const mobileItems = filteredItems.slice(0, 5);

  const NavLink = ({
    item,
    onClick,
  }: {
    item: NavItem;
    onClick?: () => void;
  }) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
          "text-sm font-medium",
          isActive
            ? "bg-[var(--accent-muted)] text-[var(--accent)]"
            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
        )}
      >
        <span
          className={cn(
            "flex-shrink-0 transition-colors",
            isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text)]"
          )}
        >
          {item.icon}
        </span>
        <span className="flex-1 text-right">{item.label}</span>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
        )}
      </Link>
    );
  };

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
          <Factory size={22} />
        </div>
        <div className="text-right">
          <p className="font-bold text-[var(--text)] text-base leading-tight">مصنع الثلج</p>
          <p className="text-xs text-[var(--text-muted)]">Snow Factory ERP</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="mr-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={onClose} />
        ))}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)]">
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-[var(--error)]/20 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors flex-shrink-0"
            title="تسجيل الخروج"
          >
            <LogOut size={16} />
          </button>
          <div className="flex-1 text-right min-w-0">
            <p className="text-sm font-semibold text-[var(--text)] truncate">
              {user.name ?? user.username}
            </p>
            <RoleBadge role={user.role} />
          </div>
          <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] font-bold text-sm flex-shrink-0">
            {(user.name ?? user.username ?? "?").charAt(0)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-[var(--surface)] border-l border-[var(--border)] sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile: Top bar with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <p className="font-bold text-[var(--text)]">مصنع الثلج</p>
          <Factory size={18} className="text-[var(--accent)]" />
        </div>
        <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] font-bold text-sm">
          {(user.name ?? user.username ?? "?").charAt(0)}
        </div>
      </div>

      {/* Mobile: Slide-over drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 h-full bg-[var(--surface)] border-l border-[var(--border)] overflow-y-auto">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile: Bottom navigation (5 main items) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] border-t border-[var(--border)] flex">
        {mobileItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 px-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="leading-tight text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
