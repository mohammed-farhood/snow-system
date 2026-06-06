"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSnowProductions, createSnowProduction } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, getTodayISOString } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { Plus, Snowflake } from "lucide-react";
import type { SnowProduction } from "@/lib/api";

const productionSchema = z.object({
  date: z.string().min(1, "يرجى اختيار التاريخ"),
  totalBlocks: z.coerce.number().min(0, "يجب أن يكون الرقم موجباً"),
  wastedBlocks: z.coerce.number().min(0),
  blocksSoldWhole: z.coerce.number().min(0),
  blocksSoldCrushed: z.coerce.number().min(0),
  pricePerBlock: z.coerce.number().min(0),
  pricePerCrushed: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type ProductionForm = z.infer<typeof productionSchema>;

export default function SnowProductionPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["snow-productions"],
    queryFn: () => getSnowProductions({ limit: 50 }),
  });

  const mutation = useMutation({
    mutationFn: createSnowProduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snow-productions"] });
      setModalOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductionForm>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      date: getTodayISOString(),
      pricePerBlock: 2500,
      pricePerCrushed: 1500,
    },
  });

  const productions = data?.data ?? [];

  const totals = productions.reduce(
    (acc, p) => ({
      totalBlocks: acc.totalBlocks + p.totalBlocks,
      wastedBlocks: acc.wastedBlocks + p.wastedBlocks,
      soldWhole: acc.soldWhole + p.blocksSoldWhole,
      soldCrushed: acc.soldCrushed + p.blocksSoldCrushed,
      revenue:
        acc.revenue +
        p.blocksSoldWhole * p.pricePerBlock +
        p.blocksSoldCrushed * p.pricePerCrushed,
    }),
    { totalBlocks: 0, wastedBlocks: 0, soldWhole: 0, soldCrushed: 0, revenue: 0 }
  );

  const columns = [
    {
      key: "date",
      header: "التاريخ",
      render: (row: SnowProduction) => (
        <span className="text-sm">{formatDate(row.date)}</span>
      ),
    },
    {
      key: "totalBlocks",
      header: "إجمالي الكتل",
      render: (row: SnowProduction) => (
        <span className="font-semibold">{formatNumber(row.totalBlocks)}</span>
      ),
    },
    {
      key: "wastedBlocks",
      header: "التالف",
      render: (row: SnowProduction) => (
        <span className="text-[var(--error)]">{formatNumber(row.wastedBlocks)}</span>
      ),
    },
    {
      key: "blocksSoldWhole",
      header: "مباع (قوالب)",
      render: (row: SnowProduction) => (
        <span className="text-[var(--success)]">{formatNumber(row.blocksSoldWhole)}</span>
      ),
    },
    {
      key: "blocksSoldCrushed",
      header: "مباع (مجروش)",
      render: (row: SnowProduction) => (
        <span className="text-[var(--success)]">{formatNumber(row.blocksSoldCrushed)}</span>
      ),
    },
    {
      key: "revenue",
      header: "الإيراد",
      render: (row: SnowProduction) => (
        <span className="font-bold text-[var(--accent)]">
          {formatCurrency(
            row.blocksSoldWhole * row.pricePerBlock + row.blocksSoldCrushed * row.pricePerCrushed
          )}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "سجّله",
      render: (row: SnowProduction) => (
        <span className="text-xs text-[var(--text-muted)]">
          {row.createdBy?.name ?? "-"}
        </span>
      ),
    },
    {
      key: "notes",
      header: "ملاحظات",
      render: (row: SnowProduction) => (
        <span className="text-xs text-[var(--text-muted)]">{row.notes ?? "-"}</span>
      ),
    },
  ];

  const onSubmit = (formData: ProductionForm) => {
    mutation.mutate(formData);
  };

  return (
    <AppLayout>
      <PageHeader
        title="الإنتاج اليومي"
        subtitle="تسجيل ومتابعة إنتاج الثلج"
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => setModalOpen(true)}
          >
            تسجيل إنتاج اليوم
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="إجمالي الكتل"
          value={formatNumber(totals.totalBlocks)}
          icon={<Snowflake size={20} />}
        />
        <StatCard
          label="التالف"
          value={formatNumber(totals.wastedBlocks)}
          valueClassName="text-[var(--error)]"
        />
        <StatCard
          label="قوالب مباعة"
          value={formatNumber(totals.soldWhole)}
          valueClassName="text-[var(--success)]"
        />
        <StatCard
          label="مجروش مباع"
          value={formatNumber(totals.soldCrushed)}
          valueClassName="text-[var(--success)]"
        />
        <StatCard
          label="إجمالي الإيراد"
          value={formatCurrency(totals.revenue)}
          valueClassName="text-[var(--accent)]"
        />
      </div>

      {/* Productions Table */}
      <Card noPadding>
        <Table
          columns={columns}
          data={productions}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="لم يتم تسجيل أي إنتاج بعد"
        />
      </Card>

      {/* Add Production Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); reset(); }}
        title="تسجيل إنتاج اليوم"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="التاريخ"
            type="date"
            error={errors.date?.message}
            {...register("date")}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="إجمالي الكتل المنتجة"
              type="number"
              min="0"
              error={errors.totalBlocks?.message}
              {...register("totalBlocks")}
            />
            <Input
              label="الكتل التالفة"
              type="number"
              min="0"
              error={errors.wastedBlocks?.message}
              {...register("wastedBlocks")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الكتل المباعة (قوالب)"
              type="number"
              min="0"
              error={errors.blocksSoldWhole?.message}
              {...register("blocksSoldWhole")}
            />
            <Input
              label="الكتل المباعة (مجروش)"
              type="number"
              min="0"
              error={errors.blocksSoldCrushed?.message}
              {...register("blocksSoldCrushed")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="سعر القالب (د.ع)"
              type="number"
              min="0"
              error={errors.pricePerBlock?.message}
              {...register("pricePerBlock")}
            />
            <Input
              label="سعر المجروش (د.ع)"
              type="number"
              min="0"
              error={errors.pricePerCrushed?.message}
              {...register("pricePerCrushed")}
            />
          </div>

          <Textarea
            label="ملاحظات"
            rows={3}
            placeholder="أي ملاحظات..."
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
              onClick={() => { setModalOpen(false); reset(); }}
              type="button"
            >
              إلغاء
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              حفظ الإنتاج
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}
