import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return "0 د.ع";
  const formatted = new Intl.NumberFormat("en-IQ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return `${formatted} د.ع`;
}

export function formatDate(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return format(d, "dd/MM/yyyy", { locale: ar });
}

export function formatDateTime(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return format(d, "dd/MM/yyyy - HH:mm", { locale: ar });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IQ").format(num);
}

export function paymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CASH: "نقدي",
    DEBT: "دين",
    PARTIAL: "جزئي",
    cash: "نقدي",
    debt: "دين",
    partial: "جزئي",
  };
  return labels[type] ?? type;
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    OWNER: "المالك",
    SUPERVISOR: "مشرف",
    WORKER: "عامل",
  };
  return labels[role] ?? role;
}

export function snowTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BLOCK: "كتلة",
    CRUSHED: "مجروش",
    block: "كتلة",
    crushed: "مجروش",
  };
  return labels[type] ?? type;
}

export function expenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    GAS: "غاز",
    ELECTRICITY: "كهرباء",
    WATER: "ضريبة ماء",
    SALARY: "راتب",
    OTHER: "أخرى",
    gas: "غاز",
    electricity: "كهرباء",
    water: "ضريبة ماء",
    salary: "راتب",
    other: "أخرى",
  };
  return labels[category] ?? category;
}

export function periodLabel(period: string): string {
  const labels: Record<string, string> = {
    daily: "يومي",
    weekly: "أسبوعي",
    monthly: "شهري",
    DAILY: "يومي",
    WEEKLY: "أسبوعي",
    MONTHLY: "شهري",
  };
  return labels[period] ?? period;
}

export function getPaymentTypeColor(type: string): string {
  const colors: Record<string, string> = {
    CASH: "success",
    DEBT: "error",
    PARTIAL: "warning",
    cash: "success",
    debt: "error",
    partial: "warning",
  };
  return colors[type] ?? "text-muted";
}

export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${year}${month}${day}-${time}${rand}`;
}

export function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function getTodayISOString(): string {
  return new Date().toISOString().split("T")[0];
}

export function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export function getStartOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}
