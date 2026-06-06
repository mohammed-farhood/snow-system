"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "@/lib/api";
import { formatCurrency, formatDate, expenseCategoryLabel, getTodayISOString, getStartOfWeek, getStartOfMonth } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { SectionLoader } from "@/components/ui/Spinner";
import { Printer, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { Transaction } from "@/lib/api";

type Period = "daily" | "weekly" | "monthly";

const periodConfig = {
  daily: { label: "يومي", startDate: getTodayISOString(), endDate: getTodayISOString() },
  weekly: { label: "أسبوعي", startDate: getStartOfWeek(), endDate: getTodayISOString() },
  monthly: { label: "شهري", startDate: getStartOfMonth(), endDate: getTodayISOString() },
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [startDate, setStartDate] = useState(getTodayISOString());
  const [endDate, setEndDate] = useState(getTodayISOString());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report", period, startDate, endDate],
    queryFn: () => getReport({ period, startDate, endDate }),
  });

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setStartDate(periodConfig[p].startDate);
    setEndDate(periodConfig[p].endDate);
  };

  const handlePrint = () => {
    window.print();
  };

  const txColumns = [
    {
      key: "date",
      header: "التاريخ",
      render: (row: Transaction) => formatDate(row.date),
    },
    {
      key: "type",
      header: "النوع",
      render: (row: Transaction) => (
        <span className="text-xs">
          {row.type === "SNOW_SALE"
            ? "❄️ مبيعات ثلج"
            : row.type === "GOODS_SALE"
            ? "📦 مبيعات بضاعة"
            : row.type === "PURCHASE"
            ? "🚛 مشتريات"
            : "💸 مصاريف"}
        </span>
      ),
    },
    {
      key: "description",
      header: "الوصف",
      render: (row: Transaction) => (
        <span className="text-sm">{row.description}</span>
      ),
    },
    {
      key: "amount",
      header: "المبلغ",
      render: (row: Transaction) => (
        <span
          className={`font-bold ${
            row.type === "EXPENSE" || row.type === "PURCHASE"
              ? "text-[var(--error)]"
              : "text-[var(--success)]"
          }`}
        >
          {row.type === "EXPENSE" || row.type === "PURCHASE" ? "-" : "+"}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="no-print">
        <PageHeader
          title="التقارير"
          subtitle="تقارير الإيرادات والمصاريف والأرباح"
          actions={
            <Button
              variant="secondary"
              icon={<Printer size={16} />}
              onClick={handlePrint}
            >
              طباعة التقرير
            </Button>
          }
        />

        {/* Period Tabs */}
        <div className="flex gap-2 mb-5 justify-end">
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                period === p
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              {periodConfig[p].label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex gap-3 mb-6 justify-end items-end">
          <Input
            label="إلى"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
          <Input
            label="من"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {isLoading ? (
        <SectionLoader />
      ) : isError ? (
        <div className="text-center py-12 text-[var(--error)]">
          حدث خطأ في تحميل التقرير.
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Print Header (hidden on screen) */}
          <div className="print-only hidden text-center mb-6">
            <h1 className="text-2xl font-bold">مصنع الثلج - تقرير {periodConfig[period].label}</h1>
            <p className="text-sm mt-1">
              من {formatDate(data.startDate)} إلى {formatDate(data.endDate)}
            </p>
            <hr className="my-3" />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="إجمالي الإيراد"
              value={formatCurrency(data.totalRevenue)}
              icon={<DollarSign size={22} />}
              valueClassName="text-[var(--success)]"
            />
            <StatCard
              label="إجمالي المصاريف"
              value={formatCurrency(data.totalExpenses)}
              icon={<TrendingDown size={22} />}
              valueClassName="text-[var(--error)]"
            />
            <StatCard
              label="صافي الربح"
              value={formatCurrency(data.netProfit)}
              icon={<TrendingUp size={22} />}
              valueClassName={
                data.netProfit >= 0
                  ? "text-[var(--success)]"
                  : "text-[var(--error)]"
              }
            />
            <StatCard
              label="حصة الشريك (50%)"
              value={formatCurrency(data.cofounderShare)}
            />
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card title="تفصيل الإيرادات">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                  <span className="font-bold text-[var(--success)]">{formatCurrency(data.snowRevenue)}</span>
                  <span className="text-sm text-[var(--text-muted)]">إيرادات الثلج</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                  <span className="font-bold text-[var(--success)]">{formatCurrency(data.goodsRevenue)}</span>
                  <span className="text-sm text-[var(--text-muted)]">إيرادات البضاعة</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold text-xl text-[var(--text)]">{formatCurrency(data.totalRevenue)}</span>
                  <span className="text-sm font-bold">الإجمالي</span>
                </div>
              </div>
            </Card>

            <Card title="توزيع المصاريف">
              <div className="space-y-2">
                {data.expenseBreakdown?.length > 0 ? (
                  data.expenseBreakdown.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5">
                      <span className="font-semibold text-[var(--error)]">{formatCurrency(item.total)}</span>
                      <span className="text-sm text-[var(--text-muted)]">
                        {expenseCategoryLabel(item.category)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--text-muted)] text-sm text-center py-4">
                    لا توجد مصاريف في هذه الفترة
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card title="تفاصيل المعاملات" noPadding>
            <Table
              columns={txColumns}
              data={data.transactions ?? []}
              keyExtractor={(row) => row.id}
              emptyMessage="لا توجد معاملات في هذه الفترة"
            />
          </Card>
        </div>
      ) : null}
    </AppLayout>
  );
}
