"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getCustomers,
  createCustomer,
  getCustomerTransactions,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { Plus, User, Phone, AlertCircle } from "lucide-react";
import type { Customer, Transaction } from "@/lib/api";

const customerSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم العميل"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

export default function CustomersPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["customer-transactions", selectedCustomer?.id],
    queryFn: () => getCustomerTransactions(selectedCustomer!.id),
    enabled: !!selectedCustomer,
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setAddModalOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  const filteredCustomers =
    customers?.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    ) ?? [];

  const totalDebt = customers?.reduce((sum, c) => sum + c.totalDebt, 0) ?? 0;
  const totalCustomers = customers?.length ?? 0;

  const columns = [
    {
      key: "name",
      header: "الاسم",
      render: (row: Customer) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] text-sm font-bold flex-shrink-0">
            {row.name.charAt(0)}
          </div>
          <span className="font-semibold">{row.name}</span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "الهاتف",
      render: (row: Customer) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.phone ?? "-"}
        </span>
      ),
    },
    {
      key: "totalPurchases",
      header: "إجمالي المشتريات",
      render: (row: Customer) => (
        <span className="font-semibold">{formatCurrency(row.totalPurchases)}</span>
      ),
    },
    {
      key: "totalDebt",
      header: "الدين المستحق",
      render: (row: Customer) =>
        row.totalDebt > 0 ? (
          <span className="text-[var(--error)] font-bold">
            {formatCurrency(row.totalDebt)}
          </span>
        ) : (
          <span className="text-[var(--success)] text-xs font-semibold">لا يوجد</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row: Customer) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setSelectedCustomer(row); }}
        >
          السجل
        </Button>
      ),
    },
  ];

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
            ? "❄️ ثلج"
            : row.type === "GOODS_SALE"
            ? "📦 بضاعة"
            : row.type === "PURCHASE"
            ? "🚛 شراء"
            : "💸 مصروف"}
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
        <span className="font-bold">{formatCurrency(row.amount)}</span>
      ),
    },
  ];

  const onSubmit = (formData: CustomerForm) => {
    mutation.mutate(formData);
  };

  return (
    <AppLayout>
      <PageHeader
        title="العملاء"
        subtitle="إدارة قائمة العملاء وسجل المعاملات"
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setAddModalOpen(true)}>
            إضافة عميل
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          label="إجمالي العملاء"
          value={String(totalCustomers)}
          icon={<User size={22} />}
        />
        <StatCard
          label="إجمالي الديون المستحقة"
          value={formatCurrency(totalDebt)}
          valueClassName="text-[var(--error)]"
          icon={<AlertCircle size={22} />}
        />
      </div>

      {/* Search */}
      <Input
        placeholder="ابحث بالاسم أو الهاتف..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <Card noPadding>
        <Table
          columns={columns}
          data={filteredCustomers}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="لا يوجد عملاء مسجلون"
          onRowClick={(row) => setSelectedCustomer(row)}
        />
      </Card>

      {/* Add Customer Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); reset(); }}
        title="إضافة عميل جديد"
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="الاسم"
            placeholder="اسم العميل"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="رقم الهاتف"
            placeholder="07xxxxxxxxx"
            type="tel"
            leftIcon={<Phone size={14} />}
            {...register("phone")}
          />
          <Input
            label="العنوان"
            placeholder="العنوان (اختياري)"
            {...register("address")}
          />

          {mutation.isError && (
            <p className="text-sm text-[var(--error)] text-right">حدث خطأ أثناء الحفظ.</p>
          )}

          <ModalFooter>
            <Button variant="secondary" onClick={() => { setAddModalOpen(false); reset(); }} type="button">
              إلغاء
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              إضافة العميل
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Customer Transactions Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={`سجل معاملات: ${selectedCustomer?.name ?? ""}`}
        size="xl"
      >
        {selectedCustomer && (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-[var(--surface-2)] text-right">
                <p className="text-xs text-[var(--text-muted)]">إجمالي المشتريات</p>
                <p className="font-bold text-lg">{formatCurrency(selectedCustomer.totalPurchases)}</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--error)]/10 text-right">
                <p className="text-xs text-[var(--text-muted)]">الدين المستحق</p>
                <p className="font-bold text-lg text-[var(--error)]">
                  {formatCurrency(selectedCustomer.totalDebt)}
                </p>
              </div>
            </div>

            <Table
              columns={txColumns}
              data={transactions ?? []}
              keyExtractor={(row) => row.id}
              loading={txLoading}
              emptyMessage="لا توجد معاملات لهذا العميل"
            />
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
