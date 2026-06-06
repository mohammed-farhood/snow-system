"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSnowSales, createSnowSale, getCustomers } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, generateReceiptNumber, getTodayISOString } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { PaymentBadge } from "@/components/ui/Badge";
import { Plus, Printer } from "lucide-react";
import { printReceipt } from "@/lib/print";
import type { SnowSale } from "@/lib/api";

const saleSchema = z.object({
  customerName: z.string().min(1, "يرجى إدخال اسم العميل"),
  snowType: z.enum(["BLOCK", "CRUSHED"], { required_error: "يرجى اختيار نوع الثلج" }),
  quantity: z.coerce.number().min(1, "يجب أن تكون الكمية أكبر من صفر"),
  unitPrice: z.coerce.number().min(1, "يجب أن يكون السعر أكبر من صفر"),
  paymentType: z.enum(["CASH", "DEBT", "PARTIAL"], { required_error: "يرجى اختيار طريقة الدفع" }),
  amountPaid: z.coerce.number().min(0),
  notes: z.string().optional(),
  date: z.string().min(1),
});

type SaleForm = z.infer<typeof saleSchema>;

export default function SnowSalesPage() {
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["snow-sales"],
    queryFn: () => getSnowSales({ limit: 100 }),
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const mutation = useMutation({
    mutationFn: createSnowSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snow-sales"] });
      setSaleModalOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      date: getTodayISOString(),
      paymentType: "CASH",
      amountPaid: 0,
    },
  });

  const sales = data?.data ?? [];
  const paymentType = watch("paymentType");
  const quantity = watch("quantity") ?? 0;
  const unitPrice = watch("unitPrice") ?? 0;
  const totalAmount = quantity * unitPrice;

  const columns = [
    {
      key: "receiptNumber",
      header: "رقم الإيصال",
      render: (row: SnowSale) => (
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {row.receiptNumber}
        </span>
      ),
    },
    {
      key: "date",
      header: "التاريخ",
      render: (row: SnowSale) => formatDate(row.date),
    },
    {
      key: "customerName",
      header: "العميل",
      render: (row: SnowSale) => (
        <span className="font-semibold">{row.customerName}</span>
      ),
    },
    {
      key: "snowType",
      header: "النوع",
      render: (row: SnowSale) => (
        <span className="text-sm">
          {row.snowType === "BLOCK" ? "🧊 قالب" : "❄️ مجروش"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "الكمية",
      render: (row: SnowSale) => formatNumber(row.quantity),
    },
    {
      key: "totalAmount",
      header: "المبلغ",
      render: (row: SnowSale) => (
        <span className="font-bold">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "paymentType",
      header: "الدفع",
      render: (row: SnowSale) => <PaymentBadge type={row.paymentType} />,
    },
    {
      key: "amountDue",
      header: "المتبقي",
      render: (row: SnowSale) =>
        row.amountDue > 0 ? (
          <span className="text-[var(--error)] font-semibold">
            {formatCurrency(row.amountDue)}
          </span>
        ) : (
          <span className="text-[var(--success)] text-xs">مدفوع</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row: SnowSale) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Printer size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            printReceipt({
              receiptNumber: row.receiptNumber,
              date: row.date,
              customerName: row.customerName,
              items: [{ name: row.snowType === "BLOCK" ? "ثلج قالب" : "ثلج مجروش", quantity: row.quantity, unitPrice: row.unitPrice, total: row.totalAmount }],
              totalAmount: row.totalAmount,
              paymentType: row.paymentType,
              amountPaid: row.amountPaid,
              amountDue: row.amountDue,
              notes: row.notes,
              type: "snow",
            });
          }}
        >
          طباعة
        </Button>
      ),
    },
  ];

  const onSubmit = (formData: SaleForm) => {
    mutation.mutate(formData);
  };

  return (
    <AppLayout>
      <PageHeader
        title="مبيعات الثلج"
        subtitle="تسجيل ومتابعة مبيعات الثلج"
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => setSaleModalOpen(true)}
          >
            بيع ثلج
          </Button>
        }
      />

      <Card noPadding>
        <Table
          columns={columns}
          data={sales}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="لا توجد مبيعات مسجلة"
        />
      </Card>

      {/* Sale Modal */}
      <Modal
        isOpen={saleModalOpen}
        onClose={() => { setSaleModalOpen(false); reset(); }}
        title="تسجيل بيع ثلج"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="التاريخ"
            type="date"
            error={errors.date?.message}
            {...register("date")}
          />

          <div>
            <label className="text-sm font-semibold text-[var(--text)] text-right block mb-1">
              اسم العميل
            </label>
            <input
              list="customers-list"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="اكتب اسم العميل..."
              {...register("customerName")}
            />
            <datalist id="customers-list">
              {customers?.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            {errors.customerName && (
              <p className="text-xs text-[var(--error)] text-right mt-1">
                {errors.customerName.message}
              </p>
            )}
          </div>

          <Select
            label="نوع الثلج"
            options={[
              { value: "BLOCK", label: "🧊 قالب (كتلة كاملة)" },
              { value: "CRUSHED", label: "❄️ مجروش" },
            ]}
            placeholder="اختر النوع..."
            error={errors.snowType?.message}
            {...register("snowType")}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الكمية"
              type="number"
              min="1"
              error={errors.quantity?.message}
              {...register("quantity")}
            />
            <Input
              label="سعر الوحدة (د.ع)"
              type="number"
              min="0"
              error={errors.unitPrice?.message}
              {...register("unitPrice")}
            />
          </div>

          {totalAmount > 0 && (
            <div className="p-3 rounded-lg bg-[var(--accent-muted)] text-right">
              <span className="text-sm text-[var(--text-muted)]">المبلغ الكلي: </span>
              <span className="text-lg font-bold text-[var(--accent)]">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          )}

          <Select
            label="طريقة الدفع"
            options={[
              { value: "CASH", label: "نقدي" },
              { value: "DEBT", label: "دين" },
              { value: "PARTIAL", label: "جزئي" },
            ]}
            error={errors.paymentType?.message}
            {...register("paymentType")}
          />

          {(paymentType === "PARTIAL") && (
            <Input
              label="المبلغ المدفوع (د.ع)"
              type="number"
              min="0"
              error={errors.amountPaid?.message}
              {...register("amountPaid")}
            />
          )}

          <Textarea
            label="ملاحظات"
            rows={2}
            placeholder="ملاحظات اختيارية..."
            {...register("notes")}
          />

          {mutation.isError && (
            <p className="text-sm text-[var(--error)] text-right">
              حدث خطأ أثناء الحفظ. يرجى المحاولة مجدداً.
            </p>
          )}

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => { setSaleModalOpen(false); reset(); }}
              type="button"
            >
              إلغاء
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              تسجيل البيع
            </Button>
          </ModalFooter>
        </form>
      </Modal>

    </AppLayout>
  );
}
