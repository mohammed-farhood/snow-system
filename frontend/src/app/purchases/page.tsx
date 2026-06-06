"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getPurchases, createPurchase, getSuppliers, getProducts } from "@/lib/api";
import { formatCurrency, formatDate, getTodayISOString } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { PaymentBadge } from "@/components/ui/Badge";
import { Plus, Trash2, AlertCircle, Printer } from "lucide-react";
import type { Purchase, Supplier } from "@/lib/api";
import { printPurchase } from "@/lib/print";

const purchaseItemSchema = z.object({
  itemName: z.string().min(1, "أدخل اسم الصنف"),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

const purchaseSchema = z.object({
  supplierName: z.string().min(1, "يرجى إدخال اسم المورد"),
  date: z.string().min(1),
  items: z.array(purchaseItemSchema).min(1),
  paymentType: z.enum(["CASH", "DEBT", "PARTIAL"]),
  amountPaid: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type PurchaseForm = z.infer<typeof purchaseSchema>;

export default function PurchasesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => getPurchases(),
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  });

  const mutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setModalOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      date: getTodayISOString(),
      paymentType: "CASH",
      amountPaid: 0,
      items: [{ itemName: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const paymentType = watch("paymentType");

  const total = watchedItems.reduce((sum, item) => {
    return sum + (item.quantity ?? 0) * (item.unitPrice ?? 0);
  }, 0);

  const purchases = data?.data ?? [];

  // Supplier debt summary
  const supplierDebts = suppliers?.filter(s => s.outstandingDebt > 0) ?? [];

  const columns = [
    {
      key: "date",
      header: "التاريخ",
      render: (row: Purchase) => formatDate(row.date),
    },
    {
      key: "supplierName",
      header: "المورد",
      render: (row: Purchase) => (
        <span className="font-semibold">{row.supplierName}</span>
      ),
    },
    {
      key: "items",
      header: "الأصناف",
      render: (row: Purchase) => (
        <span className="text-xs text-[var(--text-muted)]">
          {row.items?.length ?? 0} صنف
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "المبلغ الكلي",
      render: (row: Purchase) => (
        <span className="font-bold">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "paymentType",
      header: "الدفع",
      render: (row: Purchase) => <PaymentBadge type={row.paymentType} />,
    },
    {
      key: "amountDue",
      header: "المتبقي",
      render: (row: Purchase) =>
        row.amountDue > 0 ? (
          <span className="text-[var(--error)] font-semibold">
            {formatCurrency(row.amountDue)}
          </span>
        ) : (
          <span className="text-[var(--success)] text-xs">مدفوع</span>
        ),
    },
    {
      key: "notes",
      header: "ملاحظات",
      render: (row: Purchase) => (
        <span className="text-xs text-[var(--text-muted)]">{row.notes ?? "-"}</span>
      ),
    },
    {
      key: "print",
      header: "",
      render: (row: Purchase) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Printer size={14} />}
          onClick={(e) => { e.stopPropagation(); printPurchase(row); }}
        >
          طباعة
        </Button>
      ),
    },
  ];

  const onSubmit = (formData: PurchaseForm) => {
    mutation.mutate(formData);
  };

  return (
    <AppLayout>
      <PageHeader
        title="المشتريات"
        subtitle="تسجيل ومتابعة المشتريات"
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            تسجيل مشتريات
          </Button>
        }
      />

      {/* Supplier debts alert */}
      {supplierDebts.length > 0 && (
        <Card className="mb-6 border-[var(--warning)]/30 bg-[var(--warning)]/5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--warning)] mb-2">ديون الموردين المستحقة</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {supplierDebts.map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-2 rounded bg-[var(--surface)]">
                    <span className="text-sm text-[var(--error)] font-bold">{formatCurrency(supplier.outstandingDebt)}</span>
                    <span className="text-sm font-semibold text-[var(--text)]">{supplier.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card noPadding>
        <Table
          columns={columns}
          data={purchases}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="لا توجد مشتريات مسجلة"
        />
      </Card>

      {/* Add Purchase Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); reset(); }}
        title="تسجيل مشتريات جديدة"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="التاريخ"
            type="date"
            {...register("date")}
            error={errors.date?.message}
          />

          <div>
            <label className="text-sm font-semibold text-[var(--text)] text-right block mb-1">
              اسم المورد
            </label>
            <input
              list="suppliers-list"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="اكتب اسم المورد..."
              {...register("supplierName")}
            />
            <datalist id="suppliers-list">
              {suppliers?.map((s) => <option key={s.id} value={s.name} />)}
            </datalist>
            {errors.supplierName && (
              <p className="text-xs text-[var(--error)] text-right mt-1">{errors.supplierName.message}</p>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => append({ itemName: "", quantity: 1, unitPrice: 0 })}
              >
                إضافة صنف
              </Button>
              <label className="text-sm font-semibold text-[var(--text)]">الأصناف المشتراة</label>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end p-3 rounded-lg bg-[var(--surface-2)]">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 rounded text-[var(--error)] hover:bg-[var(--error)]/10 flex-shrink-0 mb-0.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <Input
                      label="الصنف"
                      placeholder="اسم الصنف"
                      error={errors.items?.[index]?.itemName?.message}
                      {...register(`items.${index}.itemName`)}
                    />
                    <Input
                      label="الكمية"
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity`)}
                    />
                    <Input
                      label="سعر الوحدة (د.ع)"
                      type="number"
                      min="0"
                      {...register(`items.${index}.unitPrice`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {total > 0 && (
            <div className="p-3 rounded-lg bg-[var(--surface-2)] text-right">
              <span className="text-sm text-[var(--text-muted)]">المبلغ الكلي: </span>
              <span className="text-lg font-bold text-[var(--text)]">
                {formatCurrency(total)}
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
            {...register("paymentType")}
          />

          {(paymentType === "PARTIAL") && (
            <Input
              label="المبلغ المدفوع (د.ع)"
              type="number"
              min="0"
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
            <p className="text-sm text-[var(--error)] text-right">حدث خطأ أثناء الحفظ.</p>
          )}

          <ModalFooter>
            <Button variant="secondary" onClick={() => { setModalOpen(false); reset(); }} type="button">
              إلغاء
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              حفظ المشتريات
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}
