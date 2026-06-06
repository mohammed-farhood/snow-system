"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getGoodsSales, createGoodsSale, getProducts, getCustomers } from "@/lib/api";
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
import { Receipt } from "@/components/Receipt";
import { Plus, Trash2, Printer, ShoppingCart } from "lucide-react";
import type { GoodsSale, Product } from "@/lib/api";

const saleItemSchema = z.object({
  productId: z.coerce.number().min(1, "اختر المنتج"),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

const saleSchema = z.object({
  customerName: z.string().min(1, "يرجى إدخال اسم العميل"),
  date: z.string().min(1),
  items: z.array(saleItemSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
  paymentType: z.enum(["CASH", "DEBT", "PARTIAL"]),
  amountPaid: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type SaleForm = z.infer<typeof saleSchema>;

export default function GoodsPage() {
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<GoodsSale | null>(null);
  const [quickSaleProduct, setQuickSaleProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  const { data: salesData, isLoading } = useQuery({
    queryKey: ["goods-sales"],
    queryFn: () => getGoodsSales({ limit: 100 }),
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const mutation = useMutation({
    mutationFn: createGoodsSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods-sales"] });
      setSaleModalOpen(false);
      setQuickSaleProduct(null);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      date: getTodayISOString(),
      paymentType: "CASH",
      amountPaid: 0,
      items: [{ productId: 0, quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const paymentType = watch("paymentType");

  const total = watchedItems.reduce((sum, item) => {
    return sum + (item.quantity ?? 0) * (item.unitPrice ?? 0);
  }, 0);

  const sales = salesData?.data ?? [];

  const handleQuickSale = (product: Product) => {
    setQuickSaleProduct(product);
    reset({
      date: getTodayISOString(),
      customerName: "عميل نقدي",
      paymentType: "CASH",
      amountPaid: product.currentPrice,
      items: [{ productId: product.id, quantity: 1, unitPrice: product.currentPrice }],
    });
    setSaleModalOpen(true);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products?.find((p) => p.id === parseInt(productId));
    if (product) {
      setValue(`items.${index}.unitPrice`, product.currentPrice);
    }
  };

  const productOptions = products?.map((p) => ({
    value: String(p.id),
    label: `${p.name} (${formatCurrency(p.currentPrice)})`,
  })) ?? [];

  const columns = [
    {
      key: "receiptNumber",
      header: "رقم الإيصال",
      render: (row: GoodsSale) => (
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {row.receiptNumber}
        </span>
      ),
    },
    {
      key: "date",
      header: "التاريخ",
      render: (row: GoodsSale) => formatDate(row.date),
    },
    {
      key: "customerName",
      header: "العميل",
      render: (row: GoodsSale) => (
        <span className="font-semibold">{row.customerName}</span>
      ),
    },
    {
      key: "items",
      header: "المنتجات",
      render: (row: GoodsSale) => (
        <span className="text-xs text-[var(--text-muted)]">
          {row.items?.length ?? 0} صنف
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "المبلغ",
      render: (row: GoodsSale) => (
        <span className="font-bold">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "paymentType",
      header: "الدفع",
      render: (row: GoodsSale) => <PaymentBadge type={row.paymentType} />,
    },
    {
      key: "amountDue",
      header: "المتبقي",
      render: (row: GoodsSale) =>
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
      render: (row: GoodsSale) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Printer size={14} />}
          onClick={(e) => { e.stopPropagation(); setReceiptSale(row); }}
        >
          إيصال
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
        title="مبيعات البضاعة"
        subtitle="تسجيل مبيعات المنتجات والبضائع"
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => { setQuickSaleProduct(null); setSaleModalOpen(true); reset({ date: getTodayISOString(), paymentType: "CASH", amountPaid: 0, items: [{ productId: 0, quantity: 1, unitPrice: 0 }] }); }}
          >
            تسجيل بيع
          </Button>
        }
      />

      {/* Quick Tap Products Grid */}
      {products && products.filter(p => p.isActive).length > 0 && (
        <Card title="بيع سريع" className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {products.filter(p => p.isActive).map((product) => (
              <button
                key={product.id}
                onClick={() => handleQuickSale(product)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                  <ShoppingCart size={18} />
                </div>
                <p className="text-xs font-semibold text-[var(--text)] text-center leading-tight">
                  {product.name}
                </p>
                <p className="text-xs text-[var(--accent)] font-bold">
                  {formatCurrency(product.currentPrice)}
                </p>
                <span className="text-xs bg-[var(--accent)] text-white px-2 py-0.5 rounded-full font-bold">
                  + بيع
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Sales Table */}
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
        onClose={() => { setSaleModalOpen(false); setQuickSaleProduct(null); reset(); }}
        title={quickSaleProduct ? `بيع سريع: ${quickSaleProduct.name}` : "تسجيل بيع بضاعة"}
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
              اسم العميل
            </label>
            <input
              list="customers-goods-list"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="اكتب اسم العميل..."
              {...register("customerName")}
            />
            <datalist id="customers-goods-list">
              {customers?.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
            {errors.customerName && (
              <p className="text-xs text-[var(--error)] text-right mt-1">{errors.customerName.message}</p>
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
                onClick={() => append({ productId: 0, quantity: 1, unitPrice: 0 })}
              >
                إضافة صنف
              </Button>
              <label className="text-sm font-semibold text-[var(--text)]">المنتجات</label>
            </div>
            <div className="space-y-3">
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
                    <Select
                      label="المنتج"
                      options={productOptions}
                      placeholder="اختر..."
                      error={errors.items?.[index]?.productId?.message}
                      {...register(`items.${index}.productId`, {
                        onChange: (e) => handleProductSelect(index, e.target.value),
                      })}
                    />
                    <Input
                      label="الكمية"
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity`)}
                    />
                    <Input
                      label="سعر الوحدة"
                      type="number"
                      min="0"
                      {...register(`items.${index}.unitPrice`)}
                    />
                  </div>
                </div>
              ))}
            </div>
            {errors.items && (
              <p className="text-xs text-[var(--error)] text-right mt-1">
                يجب إضافة منتج واحد على الأقل
              </p>
            )}
          </div>

          {total > 0 && (
            <div className="p-3 rounded-lg bg-[var(--accent-muted)] text-right">
              <span className="text-sm text-[var(--text-muted)]">المبلغ الكلي: </span>
              <span className="text-lg font-bold text-[var(--accent)]">
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

          {paymentType === "PARTIAL" && (
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
            <p className="text-sm text-[var(--error)] text-right">
              حدث خطأ أثناء الحفظ.
            </p>
          )}

          <ModalFooter>
            <Button variant="secondary" onClick={() => { setSaleModalOpen(false); reset(); }} type="button">
              إلغاء
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              تسجيل البيع
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={!!receiptSale}
        onClose={() => setReceiptSale(null)}
        title="إيصال البيع"
        size="md"
      >
        {receiptSale && (
          <Receipt
            receiptNumber={receiptSale.receiptNumber}
            date={receiptSale.date}
            customerName={receiptSale.customerName}
            items={receiptSale.items?.map((item) => ({
              name: item.product?.name ?? "منتج",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.totalPrice,
            })) ?? []}
            totalAmount={receiptSale.totalAmount}
            paymentType={receiptSale.paymentType}
            amountPaid={receiptSale.amountPaid}
            amountDue={receiptSale.amountDue}
            notes={receiptSale.notes}
          />
        )}
      </Modal>
    </AppLayout>
  );
}
