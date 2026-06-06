"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  getProducts,
  createProduct,
  updateProduct,
  getSuppliers,
  createSupplier,
  updateSupplier,
} from "@/lib/api";
import { formatCurrency, roleLabel } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { RoleBadge, StatusBadge } from "@/components/ui/Badge";
import { Plus, Edit2, UserX, Package, Truck, Users } from "lucide-react";
import type { User, Product, Supplier } from "@/lib/api";

// ─── Schemas ────────────────────────────────────────────────────────────────

const userSchema = z.object({
  name: z.string().min(1, "يرجى إدخال الاسم"),
  username: z.string().min(3, "اسم المستخدم 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").optional().or(z.literal("")),
  role: z.enum(["OWNER", "SUPERVISOR", "WORKER"]),
});

const productSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم المنتج"),
  unit: z.string().min(1, "يرجى إدخال الوحدة"),
  currentPrice: z.coerce.number().min(0),
  stockQuantity: z.coerce.number().min(0),
});

const supplierSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم المورد"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;
type ProductForm = z.infer<typeof productSchema>;
type SupplierForm = z.infer<typeof supplierSchema>;

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = "users" | "products" | "suppliers";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "users", label: "العمال والمستخدمين", icon: <Users size={16} /> },
  { id: "products", label: "المنتجات", icon: <Package size={16} /> },
  { id: "suppliers", label: "الموردون", icon: <Truck size={16} /> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [userModal, setUserModal] = useState<{ open: boolean; editUser?: User }>({ open: false });
  const [productModal, setProductModal] = useState<{ open: boolean; editProduct?: Product }>({ open: false });
  const [supplierModal, setSupplierModal] = useState<{ open: boolean; editSupplier?: Supplier }>({ open: false });
  const queryClient = useQueryClient();

  // ─── Users ────────────────────────────────────────────────────────

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setUserModal({ open: false }); userReset(); },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateUser>[1] }) => updateUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setUserModal({ open: false }); userReset(); },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const {
    register: userRegister,
    handleSubmit: handleUserSubmit,
    reset: userReset,
    setValue: userSetValue,
    formState: { errors: userErrors },
  } = useForm<UserForm>({ resolver: zodResolver(userSchema), defaultValues: { role: "WORKER" } });

  useEffect(() => {
    if (userModal.editUser) {
      userSetValue("name", userModal.editUser.name);
      userSetValue("username", userModal.editUser.username);
      userSetValue("role", userModal.editUser.role);
      userSetValue("password", "");
    } else {
      userReset({ role: "WORKER" });
    }
  }, [userModal]);

  const onUserSubmit = (data: UserForm) => {
    if (userModal.editUser) {
      updateUserMutation.mutate({ id: userModal.editUser.id, data: { name: data.name, role: data.role, ...(data.password ? { password: data.password } : {}) } });
    } else {
      createUserMutation.mutate({ name: data.name, username: data.username, password: data.password!, role: data.role });
    }
  };

  // ─── Products ─────────────────────────────────────────────────────

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setProductModal({ open: false }); productReset(); },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateProduct>[1] }) => updateProduct(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setProductModal({ open: false }); productReset(); },
  });

  const {
    register: productRegister,
    handleSubmit: handleProductSubmit,
    reset: productReset,
    setValue: productSetValue,
    formState: { errors: productErrors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: { stockQuantity: 0 } });

  useEffect(() => {
    if (productModal.editProduct) {
      productSetValue("name", productModal.editProduct.name);
      productSetValue("unit", productModal.editProduct.unit);
      productSetValue("currentPrice", productModal.editProduct.currentPrice);
      productSetValue("stockQuantity", productModal.editProduct.stockQuantity);
    } else {
      productReset({ stockQuantity: 0 });
    }
  }, [productModal]);

  const onProductSubmit = (data: ProductForm) => {
    if (productModal.editProduct) {
      updateProductMutation.mutate({ id: productModal.editProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  // ─── Suppliers ────────────────────────────────────────────────────

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  });

  const createSupplierMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setSupplierModal({ open: false }); supplierReset(); },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateSupplier>[1] }) => updateSupplier(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setSupplierModal({ open: false }); supplierReset(); },
  });

  const {
    register: supplierRegister,
    handleSubmit: handleSupplierSubmit,
    reset: supplierReset,
    setValue: supplierSetValue,
    formState: { errors: supplierErrors },
  } = useForm<SupplierForm>({ resolver: zodResolver(supplierSchema) });

  useEffect(() => {
    if (supplierModal.editSupplier) {
      supplierSetValue("name", supplierModal.editSupplier.name);
      supplierSetValue("phone", supplierModal.editSupplier.phone ?? "");
      supplierSetValue("address", supplierModal.editSupplier.address ?? "");
    } else {
      supplierReset();
    }
  }, [supplierModal]);

  const onSupplierSubmit = (data: SupplierForm) => {
    if (supplierModal.editSupplier) {
      updateSupplierMutation.mutate({ id: supplierModal.editSupplier.id, data });
    } else {
      createSupplierMutation.mutate(data);
    }
  };

  // ─── Columns ──────────────────────────────────────────────────────

  const userColumns = [
    {
      key: "name",
      header: "الاسم",
      render: (row: User) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: "username",
      header: "اسم المستخدم",
      render: (row: User) => <span className="font-mono text-sm">{row.username}</span>,
    },
    {
      key: "role",
      header: "الصلاحية",
      render: (row: User) => <RoleBadge role={row.role} />,
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (row: User) => <StatusBadge active={row.isActive} />,
    },
    {
      key: "actions",
      header: "",
      render: (row: User) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" icon={<Edit2 size={13} />} onClick={(e) => { e.stopPropagation(); setUserModal({ open: true, editUser: row }); }}>تعديل</Button>
          {row.isActive && (
            <Button variant="danger" size="sm" icon={<UserX size={13} />} loading={deactivateUserMutation.isPending} onClick={(e) => { e.stopPropagation(); deactivateUserMutation.mutate(row.id); }}>تعطيل</Button>
          )}
        </div>
      ),
    },
  ];

  const productColumns = [
    {
      key: "name",
      header: "المنتج",
      render: (row: Product) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: "unit",
      header: "الوحدة",
      render: (row: Product) => <span className="text-sm text-[var(--text-muted)]">{row.unit}</span>,
    },
    {
      key: "currentPrice",
      header: "السعر الحالي",
      render: (row: Product) => <span className="font-bold">{formatCurrency(row.currentPrice)}</span>,
    },
    {
      key: "stockQuantity",
      header: "الكمية",
      render: (row: Product) => <span className="text-sm">{row.stockQuantity}</span>,
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (row: Product) => <StatusBadge active={row.isActive} />,
    },
    {
      key: "actions",
      header: "",
      render: (row: Product) => (
        <Button variant="ghost" size="sm" icon={<Edit2 size={13} />} onClick={(e) => { e.stopPropagation(); setProductModal({ open: true, editProduct: row }); }}>تعديل</Button>
      ),
    },
  ];

  const supplierColumns = [
    {
      key: "name",
      header: "المورد",
      render: (row: Supplier) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: "phone",
      header: "الهاتف",
      render: (row: Supplier) => <span className="text-sm text-[var(--text-muted)]">{row.phone ?? "-"}</span>,
    },
    {
      key: "outstandingDebt",
      header: "الدين المستحق",
      render: (row: Supplier) =>
        row.outstandingDebt > 0 ? (
          <span className="text-[var(--error)] font-bold">{formatCurrency(row.outstandingDebt)}</span>
        ) : (
          <span className="text-[var(--success)] text-xs">لا يوجد</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row: Supplier) => (
        <Button variant="ghost" size="sm" icon={<Edit2 size={13} />} onClick={(e) => { e.stopPropagation(); setSupplierModal({ open: true, editSupplier: row }); }}>تعديل</Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader title="الإعدادات" subtitle="إدارة المستخدمين والمنتجات والموردين" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div>
          <div className="flex justify-start mb-4">
            <Button icon={<Plus size={16} />} onClick={() => setUserModal({ open: true })}>
              إضافة مستخدم
            </Button>
          </div>
          <Card noPadding>
            <Table columns={userColumns} data={users ?? []} keyExtractor={(row) => row.id} loading={usersLoading} emptyMessage="لا يوجد مستخدمون" />
          </Card>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div>
          <div className="flex justify-start mb-4">
            <Button icon={<Plus size={16} />} onClick={() => setProductModal({ open: true })}>
              إضافة منتج
            </Button>
          </div>
          <Card noPadding>
            <Table columns={productColumns} data={products ?? []} keyExtractor={(row) => row.id} loading={productsLoading} emptyMessage="لا توجد منتجات" />
          </Card>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === "suppliers" && (
        <div>
          <div className="flex justify-start mb-4">
            <Button icon={<Plus size={16} />} onClick={() => setSupplierModal({ open: true })}>
              إضافة مورد
            </Button>
          </div>
          <Card noPadding>
            <Table columns={supplierColumns} data={suppliers ?? []} keyExtractor={(row) => row.id} loading={suppliersLoading} emptyMessage="لا يوجد موردون" />
          </Card>
        </div>
      )}

      {/* User Modal */}
      <Modal isOpen={userModal.open} onClose={() => { setUserModal({ open: false }); userReset(); }} title={userModal.editUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"} size="sm">
        <form onSubmit={handleUserSubmit(onUserSubmit)} className="space-y-4">
          <Input label="الاسم الكامل" error={userErrors.name?.message} {...userRegister("name")} />
          <Input label="اسم المستخدم" error={userErrors.username?.message} {...userRegister("username")} disabled={!!userModal.editUser} />
          <Input label={userModal.editUser ? "كلمة المرور الجديدة (اتركها فارغة للإبقاء)" : "كلمة المرور"} type="password" error={userErrors.password?.message} {...userRegister("password")} />
          <Select label="الصلاحية" options={[{ value: "OWNER", label: "مالك" }, { value: "SUPERVISOR", label: "مشرف" }, { value: "WORKER", label: "عامل" }]} error={userErrors.role?.message} {...userRegister("role")} />
          {(createUserMutation.isError || updateUserMutation.isError) && (
            <p className="text-sm text-[var(--error)] text-right">حدث خطأ أثناء الحفظ.</p>
          )}
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setUserModal({ open: false }); userReset(); }} type="button">إلغاء</Button>
            <Button type="submit" loading={createUserMutation.isPending || updateUserMutation.isPending}>حفظ</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Product Modal */}
      <Modal isOpen={productModal.open} onClose={() => { setProductModal({ open: false }); productReset(); }} title={productModal.editProduct ? "تعديل المنتج" : "إضافة منتج جديد"} size="sm">
        <form onSubmit={handleProductSubmit(onProductSubmit)} className="space-y-4">
          <Input label="اسم المنتج" error={productErrors.name?.message} {...productRegister("name")} />
          <Input label="الوحدة (قطعة، كيلو، علبة...)" error={productErrors.unit?.message} {...productRegister("unit")} />
          <Input label="السعر الحالي (د.ع)" type="number" min="0" error={productErrors.currentPrice?.message} {...productRegister("currentPrice")} />
          <Input label="الكمية في المخزن" type="number" min="0" {...productRegister("stockQuantity")} />
          {(createProductMutation.isError || updateProductMutation.isError) && (
            <p className="text-sm text-[var(--error)] text-right">حدث خطأ أثناء الحفظ.</p>
          )}
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setProductModal({ open: false }); productReset(); }} type="button">إلغاء</Button>
            <Button type="submit" loading={createProductMutation.isPending || updateProductMutation.isPending}>حفظ</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Supplier Modal */}
      <Modal isOpen={supplierModal.open} onClose={() => { setSupplierModal({ open: false }); supplierReset(); }} title={supplierModal.editSupplier ? "تعديل المورد" : "إضافة مورد جديد"} size="sm">
        <form onSubmit={handleSupplierSubmit(onSupplierSubmit)} className="space-y-4">
          <Input label="اسم المورد" error={supplierErrors.name?.message} {...supplierRegister("name")} />
          <Input label="رقم الهاتف" type="tel" {...supplierRegister("phone")} />
          <Input label="العنوان" {...supplierRegister("address")} />
          {(createSupplierMutation.isError || updateSupplierMutation.isError) && (
            <p className="text-sm text-[var(--error)] text-right">حدث خطأ أثناء الحفظ.</p>
          )}
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setSupplierModal({ open: false }); supplierReset(); }} type="button">إلغاء</Button>
            <Button type="submit" loading={createSupplierMutation.isPending || updateSupplierMutation.isPending}>حفظ</Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}
