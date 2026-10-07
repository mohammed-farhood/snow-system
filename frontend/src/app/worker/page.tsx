"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createSnowProduction,
  createSnowSale,
  createGoodsSale,
  getProducts,
  getSettings,
} from "@/lib/api";
import { getUser, isAuthenticated, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { printReceipt } from "@/lib/print";
import {
  Factory,
  LogOut,
  Snowflake,
  Package,
  Check,
  Printer,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/api";

type Step = "home" | "production" | "snow" | "goods" | "success";

interface SuccessData {
  type: "production" | "snow" | "goods";
  receiptData?: Parameters<typeof printReceipt>[0];
}

// ── Reusable big input ────────────────────────────────────────────────────────

function BigInput({
  label,
  value,
  onChange,
  type = "number",
  placeholder = "0",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-base font-bold text-[var(--text)] text-right">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        inputMode={type === "number" ? "numeric" : "text"}
        className={cn(
          "w-full border-2 rounded-xl px-5 py-4 text-xl font-bold focus:outline-none text-right",
          readOnly
            ? "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed"
            : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)]"
        )}
      />
    </div>
  );
}

// ── Two-option toggle ─────────────────────────────────────────────────────────

function ToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-base font-bold text-[var(--text)] text-right">{label}</label>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 py-4 rounded-xl text-lg font-bold transition-all",
              value === opt.value
                ? "bg-[var(--accent)] text-white shadow-md"
                : "bg-[var(--surface-2)] text-[var(--text-muted)] border-2 border-[var(--border)]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Back + title row ──────────────────────────────────────────────────────────

function FormHeader({
  title,
  icon,
  onBack,
}: {
  title: string;
  icon: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="mb-7">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-5"
      >
        <ChevronRight size={20} />
        <span className="text-base font-semibold">رجوع</span>
      </button>
      <div className="flex items-center justify-end gap-3">
        <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
        {icon}
      </div>
    </div>
  );
}

// ── Error + Submit ────────────────────────────────────────────────────────────

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xl font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
    >
      {loading ? "جاري الحفظ..." : label}
    </button>
  );
}

// ── Customer name row ─────────────────────────────────────────────────────────

function CustomerInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-base font-bold text-[var(--text)] text-right">اسم العميل</label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange("عميل نقدي")}
          className="py-4 px-4 rounded-xl bg-[var(--surface-2)] border-2 border-[var(--border)] text-[var(--text-muted)] font-bold text-sm hover:border-[var(--accent)] whitespace-nowrap flex-shrink-0"
        >
          نقدي
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-[var(--surface-2)] border-2 border-[var(--border)] rounded-xl text-[var(--text)] px-5 py-4 text-xl font-bold focus:outline-none focus:border-[var(--accent)] text-right"
        />
      </div>
    </div>
  );
}

// ── Home view ─────────────────────────────────────────────────────────────────

function HomeView({ name, onSelect }: { name: string; onSelect: (s: Step) => void }) {
  const tiles: { step: Step; emoji: string; label: string; sub: string; color: string }[] = [
    {
      step: "production",
      emoji: "❄️",
      label: "تسجيل الإنتاج",
      sub: "سجّل كتل الثلج المنتجة اليوم",
      color: "bg-[var(--accent-muted)] border-[var(--accent)]/30",
    },
    {
      step: "snow",
      emoji: "🧊",
      label: "بيع ثلج",
      sub: "قالب كامل أو مجروش",
      color: "bg-blue-500/10 border-blue-500/20",
    },
    {
      step: "goods",
      emoji: "📦",
      label: "بيع بضاعة",
      sub: "مشروبات ومنتجات المصنع",
      color: "bg-green-500/10 border-green-500/20",
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-5 gap-5">
      <div className="text-right mt-3 mb-2">
        <p className="text-2xl font-bold text-[var(--text)]">مرحباً، {name}!</p>
        <p className="text-[var(--text-muted)] text-base mt-1">ماذا تريد أن تسجّل اليوم؟</p>
      </div>
      <div className="flex flex-col gap-4">
        {tiles.map((tile) => (
          <button
            key={tile.step}
            onClick={() => onSelect(tile.step)}
            className={cn(
              "w-full flex items-center gap-5 p-6 rounded-2xl border text-right transition-all active:scale-[0.98] hover:shadow-lg",
              tile.color
            )}
          >
            <span className="text-5xl flex-shrink-0">{tile.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-[var(--text)]">{tile.label}</p>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">{tile.sub}</p>
            </div>
            <ChevronRight size={22} className="text-[var(--text-muted)] flex-shrink-0 rotate-180" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Production form ───────────────────────────────────────────────────────────

function ProductionView({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (d: SuccessData) => void;
}) {
  const [totalBlocks, setTotalBlocks] = useState("");
  const [wastedBlocks, setWastedBlocks] = useState("0");
  const [soldWhole, setSoldWhole] = useState("0");
  const [soldCrushed, setSoldCrushed] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(totalBlocks) || 0;
    if (total <= 0) {
      setError("يرجى إدخال عدد الكتل المنتجة");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await createSnowProduction({
        totalBlocks: total,
        wastedBlocks: parseInt(wastedBlocks) || 0,
        blocksSoldWhole: parseInt(soldWhole) || 0,
        blocksSoldCrushed: parseInt(soldCrushed) || 0,
        notes: notes.trim() || undefined,
      });
      onSuccess({ type: "production" });
    } catch {
      setError("حدث خطأ أثناء الحفظ. يرجى المحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-5">
      <FormHeader
        title="تسجيل الإنتاج"
        icon={<div className="w-12 h-12 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center"><Snowflake size={24} className="text-[var(--accent)]" /></div>}
        onBack={onBack}
      />
      <form onSubmit={handleSubmit} className="space-y-5">
        <BigInput label="إجمالي الكتل المنتجة" value={totalBlocks} onChange={setTotalBlocks} placeholder="أدخل العدد" />
        <BigInput label="الكتل التالفة" value={wastedBlocks} onChange={setWastedBlocks} />
        <BigInput label="الكتل المباعة (قوالب كاملة)" value={soldWhole} onChange={setSoldWhole} />
        <BigInput label="الثلج المجروش المباع" value={soldCrushed} onChange={setSoldCrushed} />
        <div className="space-y-2">
          <label className="block text-base font-bold text-[var(--text)] text-right">ملاحظات (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="أي ملاحظات..."
            className="w-full bg-[var(--surface-2)] border-2 border-[var(--border)] rounded-xl text-[var(--text)] px-5 py-4 text-base font-medium focus:outline-none focus:border-[var(--accent)] text-right resize-none"
          />
        </div>
        {error && <p className="text-[var(--error)] text-base font-semibold text-right">{error}</p>}
        <SubmitButton loading={loading} label="حفظ الإنتاج" />
      </form>
    </div>
  );
}

// ── Snow sale form ────────────────────────────────────────────────────────────

function SnowView({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (d: SuccessData) => void;
}) {
  const [customerName, setCustomerName] = useState("عميل نقدي");
  const [snowType, setSnowType] = useState<"BLOCK" | "CRUSHED">("BLOCK");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentType, setPaymentType] = useState<"CASH" | "DEBT">("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  useEffect(() => {
    if (settings) {
      setUnitPrice(
        String(snowType === "BLOCK" ? settings.snowBlockPrice : settings.snowCrushedPrice)
      );
    }
  }, [snowType, settings]);

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const total = qty * price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { setError("يرجى إدخال اسم العميل"); return; }
    if (qty <= 0) { setError("يرجى إدخال الكمية"); return; }
    if (price <= 0) { setError("يرجى إدخال سعر الوحدة"); return; }
    setError("");
    setLoading(true);
    try {
      const sale = await createSnowSale({
        customerName: customerName.trim(),
        snowType,
        quantity: qty,
        unitPrice: price,
        paymentType,
        amountPaid: paymentType === "CASH" ? total : 0,
      });
      onSuccess({
        type: "snow",
        receiptData: {
          receiptNumber: sale.receiptNumber,
          date: sale.date,
          customerName: sale.customerName,
          items: [{ name: snowType === "BLOCK" ? "ثلج قالب" : "ثلج مجروش", quantity: qty, unitPrice: price, total }],
          totalAmount: total,
          paymentType,
          amountPaid: paymentType === "CASH" ? total : 0,
          amountDue: paymentType === "DEBT" ? total : 0,
          type: "snow",
        },
      });
    } catch {
      setError("حدث خطأ أثناء الحفظ. يرجى المحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-5">
      <FormHeader
        title="بيع ثلج"
        icon={<span className="text-4xl">🧊</span>}
        onBack={onBack}
      />
      <form onSubmit={handleSubmit} className="space-y-5">
        <CustomerInput value={customerName} onChange={setCustomerName} />
        <ToggleGroup
          label="نوع الثلج"
          value={snowType}
          onChange={(v) => setSnowType(v as "BLOCK" | "CRUSHED")}
          options={[
            { value: "BLOCK", label: "🧊 قالب" },
            { value: "CRUSHED", label: "❄️ مجروش" },
          ]}
        />
        <BigInput label="الكمية" value={quantity} onChange={setQuantity} placeholder="1" />
        <BigInput label="سعر الوحدة (د.ع)" value={unitPrice} onChange={setUnitPrice} placeholder="2500" />

        {total > 0 && (
          <div className="p-5 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent)]/30 text-right">
            <p className="text-sm text-[var(--text-muted)]">المبلغ الكلي</p>
            <p className="text-4xl font-bold text-[var(--accent)] mt-1">{formatCurrency(total)}</p>
          </div>
        )}

        <ToggleGroup
          label="طريقة الدفع"
          value={paymentType}
          onChange={(v) => setPaymentType(v as "CASH" | "DEBT")}
          options={[
            { value: "CASH", label: "نقدي" },
            { value: "DEBT", label: "دين" },
          ]}
        />
        {error && <p className="text-[var(--error)] text-base font-semibold text-right">{error}</p>}
        <SubmitButton loading={loading} label="تسجيل البيع" />
      </form>
    </div>
  );
}

// ── Goods sale form ───────────────────────────────────────────────────────────

type CartItem = { product: Product; quantity: number };

function GoodsView({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (d: SuccessData) => void;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("عميل نقدي");
  const [paymentType, setPaymentType] = useState<"CASH" | "DEBT">("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const activeProducts = products?.filter((p) => p.isActive) ?? [];

  const addProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeProduct = (productId: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((i) => i.product.id !== productId);
      return prev.map((i) => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const cartQty = (productId: number) => cart.find((i) => i.product.id === productId)?.quantity ?? 0;
  const total = cart.reduce((sum, i) => sum + i.quantity * i.product.currentPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { setError("يرجى إدخال اسم العميل"); return; }
    if (cart.length === 0) { setError("يرجى اختيار منتج واحد على الأقل"); return; }
    setError("");
    setLoading(true);
    try {
      const sale = await createGoodsSale({
        customerName: customerName.trim(),
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity, unitPrice: i.product.currentPrice })),
        paymentType,
        amountPaid: paymentType === "CASH" ? total : 0,
      });
      onSuccess({
        type: "goods",
        receiptData: {
          receiptNumber: sale.receiptNumber,
          date: sale.date,
          customerName: sale.customerName,
          items: cart.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unitPrice: i.product.currentPrice,
            total: i.quantity * i.product.currentPrice,
          })),
          totalAmount: total,
          paymentType,
          amountPaid: paymentType === "CASH" ? total : 0,
          amountDue: paymentType === "DEBT" ? total : 0,
          type: "goods",
        },
      });
    } catch {
      setError("حدث خطأ أثناء الحفظ. يرجى المحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-5 pb-10">
      <FormHeader
        title="بيع بضاعة"
        icon={<Package size={32} className="text-green-400" />}
        onBack={onBack}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product grid */}
        <div className="space-y-2">
          <label className="block text-base font-bold text-[var(--text)] text-right">اختر المنتجات</label>
          {activeProducts.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8">لا توجد منتجات</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activeProducts.map((product) => {
                const qty = cartQty(product.id);
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all",
                      qty > 0
                        ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                        : "border-[var(--border)] bg-[var(--surface-2)]"
                    )}
                  >
                    <p className="text-sm font-bold text-[var(--text)] text-right leading-tight mb-1">{product.name}</p>
                    <p className="text-sm text-[var(--accent)] font-bold text-right">{formatCurrency(product.currentPrice)}</p>
                    <div className="flex items-center gap-2 mt-3 justify-end">
                      {qty > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => removeProduct(product.id)}
                            className="w-9 h-9 rounded-full bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center hover:border-[var(--error)] hover:text-[var(--error)] transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-xl font-bold text-[var(--text)] min-w-[24px] text-center">{qty}</span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <>
            {/* Cart summary */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-sm font-bold text-right text-[var(--text-muted)] mb-3">ملخص الطلب</p>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between">
                    <span className="font-bold text-[var(--accent)] text-sm">{formatCurrency(item.quantity * item.product.currentPrice)}</span>
                    <span className="text-[var(--text)] text-sm">{item.product.name} × {item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--border)] mt-3 pt-3 flex justify-between items-center">
                <span className="text-2xl font-bold text-[var(--accent)]">{formatCurrency(total)}</span>
                <span className="text-base font-bold text-[var(--text)]">المجموع</span>
              </div>
            </div>

            <CustomerInput value={customerName} onChange={setCustomerName} />
            <ToggleGroup
              label="طريقة الدفع"
              value={paymentType}
              onChange={(v) => setPaymentType(v as "CASH" | "DEBT")}
              options={[
                { value: "CASH", label: "نقدي" },
                { value: "DEBT", label: "دين" },
              ]}
            />
            {error && <p className="text-[var(--error)] text-base font-semibold text-right">{error}</p>}
            <SubmitButton loading={loading} label={`تسجيل البيع — ${formatCurrency(total)}`} />
          </>
        )}
      </form>
    </div>
  );
}

// ── Success view ──────────────────────────────────────────────────────────────

function SuccessView({ data, onBack }: { data: SuccessData; onBack: () => void }) {
  const messages: Record<SuccessData["type"], string> = {
    production: "تم حفظ سجل الإنتاج",
    snow: "تم تسجيل بيع الثلج",
    goods: "تم تسجيل البيع",
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
      <div className="w-28 h-28 rounded-full bg-green-500/20 flex items-center justify-center">
        <Check size={64} className="text-green-400" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-3xl font-bold text-[var(--text)]">تم بنجاح!</p>
        <p className="text-[var(--text-muted)] text-lg mt-2">{messages[data.type]}</p>
      </div>
      {data.receiptData && (
        <button
          onClick={() => printReceipt(data.receiptData!)}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-bold text-lg hover:border-[var(--accent)] transition-colors"
        >
          <Printer size={20} />
          طباعة الإيصال
        </button>
      )}
      <button
        onClick={onBack}
        className="w-full max-w-xs py-5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xl font-bold rounded-2xl transition-all active:scale-[0.98]"
      >
        رجوع للرئيسية
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkerPage() {
  const router = useRouter();
  const user = getUser();
  const [step, setStep] = useState<Step>("home");
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    if (user?.role !== "WORKER") {
      router.replace("/dashboard");
    }
  }, []);

  if (!user) return null;

  const handleSuccess = (data: SuccessData) => {
    setSuccessData(data);
    setStep("success");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-5 py-3.5">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--error)]/10"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">خروج</span>
        </button>
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[var(--text)] text-lg">مصنع الثلج</span>
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center">
            <Factory size={18} className="text-[var(--accent)]" />
          </div>
        </div>
      </header>

      {/* Content — centered, max width for readability */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {step === "home" && (
          <HomeView name={user.name ?? user.username} onSelect={setStep} />
        )}
        {step === "production" && (
          <ProductionView onBack={() => setStep("home")} onSuccess={handleSuccess} />
        )}
        {step === "snow" && (
          <SnowView onBack={() => setStep("home")} onSuccess={handleSuccess} />
        )}
        {step === "goods" && (
          <GoodsView onBack={() => setStep("home")} onSuccess={handleSuccess} />
        )}
        {step === "success" && successData && (
          <SuccessView
            data={successData}
            onBack={() => { setSuccessData(null); setStep("home"); }}
          />
        )}
      </div>
    </div>
  );
}
