"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getExpenses, createExpense } from "@/lib/api";
import { formatCurrency, formatDate, expenseCategoryLabel, getTodayISOString } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { Plus, Wallet, Printer } from "lucide-react";
import { printExpense } from "@/lib/print";
import type { Expense } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const expenseCategories = [
  { value: "GAS", label: "غاز" },
  { value: "ELECTRICITY", label: "كهرباء" },
  { value: "WATER", label: "ضريبة ماء" },
  { value: "SALARY", label: "راتب" },
  { value: "OTHER", label: "أخرى" },
];

const expenseSchema = z.object({
  date: z.string().min(1),
  category: z.enum(["GAS", "ELECTRICITY", "WATER", "SALARY", "OTHER"]),
  description: z.string().min(1, "يرجى إدخال الوصف"),
  amount: z.coerce.number().min(1, "يجب أن يكون المبلغ أكبر من صفر"),
  notes: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

export default function ExpensesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => getExpenses(),
  });

  const mutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setModalOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: getTodayISOString(),
      category: "OTHER",
    },
  });

  const expenses = data?.data ?? [];
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown
  const categoryBreakdown = expenseCategories.map((cat) => ({
    category: cat.label,
    total: expenses
      .filter((e) => e.category === cat.value)
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter((c) => c.total > 0);

  const columns = [
    {
      key: "date",
      header: "التاريخ",
      render: (row: Expense) => formatDate(row.date),
    },
    {
      key: "category",
      header: "الفئة",
      render: (row: Expense) => (
        <span className="text-sm font-semibold">
          {expenseCategoryLabel(row.category)}
        </span>
      ),
    },
    {
      key: "description",
      header: "الوصف",
      render: (row: Expense) => (
        <span className="text-sm">{row.description}</span>
      ),
    },
    {
      key: "amount",
      header: "المبلغ",
      render: (row: Expense) => (
        <span className="font-bold text-[var(--error)]">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "recordedBy",
      header: "سجّله",
      render: (row: Expense) => (
        <span className="text-xs text-[var(--text-muted)]">
          {row.recordedBy?.name ?? "-"}
        </span>
      ),
    },
    {
      key: "print",
      header: "",
      render: (row: Expense) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Printer size={14} />}
          onClick={(e) => { e.stopPropagation(); printExpense(row); }}
        >
          طباعة
        </Button>
      ),
    },
  ];

  const onSubmit = (formData: ExpenseForm) => {
    mutation.mutate(formData);
  };

  return (
    <AppLayout>
      <PageHeader
        title="المصاريف"
        subtitle="تسجيل ومتابعة المصاريف"
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            إضافة مصروف
          </Button>
        }
      />

      {/* Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          label="إجمالي المصاريف"
          value={formatCurrency(totalExpenses)}
          icon={<Wallet size={22} />}
          valueClassName="text-[var(--error)]"
        />
        <StatCard
          label="عدد السجلات"
          value={String(expenses.length)}
          sub="إجمالي السجلات المسجلة"
        />
      </div>

      {/* Category Chart */}
      {categoryBreakdown.length > 0 && (
        <Card title="توزيع المصاريف حسب الفئة" className="mb-6">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
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
                  }}
                  formatter={(value: number) => [formatCurrency(value), "المبلغ"]}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {categoryBreakdown.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card noPadding>
        <Table
          columns={columns}
          data={expenses}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="لا توجد مصاريف مسجلة"
        />
      </Card>

      {/* Add Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); reset(); }}
        title="إضافة مصروف جديد"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="التاريخ"
            type="date"
            {...register("date")}
            error={errors.date?.message}
          />

          <Select
            label="الفئة"
            options={expenseCategories}
            error={errors.category?.message}
            {...register("category")}
          />

          <Input
            label="الوصف"
            placeholder="وصف المصروف"
            error={errors.description?.message}
            {...register("description")}
          />

          <Input
            label="المبلغ (د.ع)"
            type="number"
            min="1"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <Textarea
            label="ملاحظات"
            rows={2}
            placeholder="ملاحظات اختيارية..."
            {...register("notes")}
          />

          {mutation.isError && (
            <p className="text-sm text-[var(--error)] text-right">حدث خطأ أثناء الحفظ.</p>
          )}

          <ModalFooter>
            <Button variant="secondary" onClick={() => { setModalOpen(false); reset(); }} type="button">
              إلغاء
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              حفظ المصروف
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}
