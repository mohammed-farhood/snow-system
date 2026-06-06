"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, type RecentTransaction } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, paymentTypeLabel } from "@/lib/utils";
import { getUser, isOwner } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentBadge } from "@/components/ui/Badge";
import { SectionLoader } from "@/components/ui/Spinner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Snowflake,
  Users2,
} from "lucide-react";

type Period = "daily" | "weekly" | "monthly";

const periodLabels: Record<Period, string> = {
  daily: "اليوم",
  weekly: "هذا الأسبوع",
  monthly: "هذا الشهر",
};

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const user = getUser();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => getDashboardStats(period),
  });

  return (
    <AppLayout>
      <PageHeader
        title="لوحة التحكم"
        subtitle={`مرحباً، ${user?.name ?? ""}!`}
      />

      {/* Period Selector */}
      <div className="flex gap-2 mb-6 justify-end">
        {(Object.entries(periodLabels) as [Period, string][]).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                period === key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {isLoading ? (
        <SectionLoader />
      ) : isError ? (
        <div className="text-center py-12 text-[var(--error)]">
          حدث خطأ في تحميل البيانات. يرجى المحاولة مجدداً.
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="الإيراد الكلي"
              value={formatCurrency(data.revenue)}
              icon={<DollarSign size={22} />}
            />
            <StatCard
              label="المصاريف الكلية"
              value={formatCurrency(data.expenses)}
              icon={<TrendingDown size={22} />}
              valueClassName="text-[var(--error)]"
            />
            <StatCard
              label="صافي الربح"
              value={formatCurrency(data.profit)}
              icon={<TrendingUp size={22} />}
              valueClassName={
                data.profit >= 0
                  ? "text-[var(--success)]"
                  : "text-[var(--error)]"
              }
            />
            <StatCard
              label="إنتاج الثلج"
              value={`${formatNumber(data.snowProduced)} كتلة`}
              sub={`مباع: ${formatNumber(data.snowSold)} | تالف: ${formatNumber(data.snowWasted)}`}
              icon={<Snowflake size={22} />}
            />
          </div>

          {/* Cofounder Share (OWNER only) */}
          {isOwner() && (
            <Card className="border-[var(--accent)]/30 bg-[var(--accent-muted)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users2 size={20} className="text-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-muted)]">50% من إيراد الثلج</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-muted)]">حصة الشريك (50%)</p>
                  <p className="text-xl font-bold text-[var(--accent)]">
                    {formatCurrency(data.cofounderShare)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Revenue Chart */}
          {data.revenueChart && data.revenueChart.length > 0 && (
            <Card title="مخطط الإيراد والمصاريف">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.revenueChart}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--error)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--error)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      tickFormatter={(v) => formatDate(v)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--text)",
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "revenue" ? "الإيراد" : "المصاريف",
                      ]}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="var(--error)"
                      strokeWidth={2}
                      fill="url(#colorExpenses)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card title="آخر المعاملات">
            {data.recentTransactions && data.recentTransactions.length > 0 ? (
              <div className="divide-y divide-[var(--border)]">
                {data.recentTransactions.map((tx: RecentTransaction) => {
                  const isExpense = tx.type === "expense";
                  const isSnow = tx.type === "snow_sale";
                  const isGoods = tx.type === "goods_sale";
                  return (
                    <div
                      key={`${tx.type}-${tx.id}`}
                      className="flex items-center justify-between py-3 gap-4"
                    >
                      <span
                        className={`text-sm font-bold ${
                          isExpense
                            ? "text-[var(--error)]"
                            : "text-[var(--success)]"
                        }`}
                      >
                        {isExpense
                          ? `-${formatCurrency(Math.abs(tx.amount))}`
                          : `+${formatCurrency(tx.amount)}`}
                      </span>
                      <div className="flex-1 text-right">
                        <p className="text-sm text-[var(--text)]">{tx.party}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs">
                        {isSnow
                          ? "❄️"
                          : isGoods
                          ? "📦"
                          : "💸"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-[var(--text-muted)] py-8">
                لا توجد معاملات حديثة
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </AppLayout>
  );
}
