"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck, Wallet } from "lucide-react";
import { api, post, type Product, type Report, type SupplierRow } from "@/lib/api";
import { EXPENSE, todayKey } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { ExpenseSheet } from "@/components/QuickSheets";
import { PaymentSheet } from "@/components/PaymentSheet";
import { AmountField, Done, Empty, ErrorLine, Money, PageTitle, Skeleton, Stepper } from "@/components/ui";

type Tab = "expense" | "purchase" | "suppliers";

export default function MoneyPage() {
  return (
    <Shell roles={["OWNER", "SUPERVISOR"]}>
      <Suspense>
        <Money_ />
      </Suspense>
    </Shell>
  );
}

function Money_() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "expense");
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="مصاريف ومشتريات" />
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(
          [
            ["expense", "مصاريف"],
            ["purchase", "شراء بضاعة"],
            ["suppliers", "الموردين"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className="chip justify-center" aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "expense" && <Expenses />}
      {tab === "purchase" && <Purchase onDone={() => setTab("suppliers")} />}
      {tab === "suppliers" && <Suppliers />}
    </div>
  );
}

function Expenses() {
  const [open, setOpen] = useState(false);
  const from = todayKey().slice(0, 8) + "01";
  const { data } = useQuery({ queryKey: ["report", from, todayKey()], queryFn: () => api<Report>(`/reports?from=${from}&to=${todayKey()}`) });
  const max = Math.max(1, ...(data?.expenses.byCategory.map((c) => c.total) ?? []));
  return (
    <div className="grid gap-4">
      <button className="btn-sun w-full text-xl" onClick={() => setOpen(true)}>
        <Plus /> مصروف جديد
      </button>
      <div className="panel p-5">
        <p className="label">مصاريف هذا الشهر</p>
        {!data ? (
          <Skeleton />
        ) : (
          <>
            <Money v={data.expenses.total} className="num text-4xl text-debt" />
            {data.expenses.byCategory.length === 0 ? (
              <p className="mt-3 text-muted">ماكو مصاريف هذا الشهر</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {data.expenses.byCategory.map((c) => (
                  <li key={c.category}>
                    <div className="flex justify-between font-semibold">
                      <span>{EXPENSE[c.category]}</span>
                      <Money v={c.total} />
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-line/60">
                      <div className="h-full rounded-full bg-debt/70" style={{ width: `${(c.total / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <ExpenseSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

type Line = { qty: number; cost: number };

function Purchase({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api<Product[]>("/products") });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => api<SupplierRow[]>("/suppliers") });
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<Record<number, Line>>({});
  const [pay, setPay] = useState<"full" | "debt" | "part">("full");
  const [part, setPart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const goods = products?.filter((p) => p.kind === "GOODS" && p.isActive) ?? [];
  const chosen = Object.entries(lines).filter(([, l]) => l.qty > 0);
  const total = chosen.reduce((s, [, l]) => s + l.qty * l.cost, 0);
  const paid = pay === "full" ? total : pay === "debt" ? 0 : Math.min(part, total);
  const setLine = (id: number, patch: Partial<Line>) => setLines((ls) => ({ ...ls, [id]: { ...(ls[id] ?? { qty: 0, cost: 0 }), ...patch } }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await post("/purchases", {
        supplierName: supplier,
        items: chosen.map(([id, l]) => ({ productId: Number(id), quantity: l.qty, cost: l.cost })),
        paid,
      });
      qc.invalidateQueries();
      setDone(total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done !== null)
    return (
      <Done title="انحفظ الشراء" sub={<>زادت البضاعة بالمخزن، المجموع <Money v={done} /></>}>
        <button className="btn-teal" onClick={onDone}>تمام</button>
      </Done>
    );
  if (!products) return <Skeleton h="h-60" />;
  if (!goods.length) return <Empty icon={<Truck size={44} />} title="ماكو بضاعة معرفة" sub="أضف المواد من الإعدادات أولاً" />;

  return (
    <div className="grid gap-4">
      <div>
        <label className="label">المورد</label>
        <input className="field" placeholder="اسم المورد" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        <div className="mt-2 flex flex-wrap gap-2">
          {suppliers?.filter((s) => s.name !== supplier).slice(0, 5).map((s) => (
            <button key={s.id} className="chip" onClick={() => setSupplier(s.name)}>{s.name}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {goods.map((p) => {
          const l = lines[p.id] ?? { qty: 0, cost: 0 };
          return (
            <div key={p.id} className={`panel p-3 ${l.qty ? "border-teal" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm text-muted">باقي <span dir="ltr">{p.stock}</span> {p.unit}</p>
                </div>
                <Stepper value={l.qty} onChange={(v) => setLine(p.id, { qty: v })} label={`عدد ${p.name}`} />
              </div>
              {l.qty > 0 && (
                <div className="fade mt-2">
                  <AmountField label={`سعر ال${p.unit} علينا`} value={l.cost} onChange={(v) => setLine(p.id, { cost: v })} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {chosen.length > 0 && (
        <div className="panel grid gap-3 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-teal">المجموع</span>
            <Money v={total} className="num text-3xl text-teal" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["full", "دفعنا كامل"],
                ["debt", "دين علينا"],
                ["part", "دفعنا جزء"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className="chip justify-center" aria-pressed={pay === id} onClick={() => setPay(id)}>
                {label}
              </button>
            ))}
          </div>
          {pay === "part" && <AmountField label="كم دفعنا؟" value={part} onChange={setPart} />}
        </div>
      )}

      <ErrorLine msg={error} />
      <button className="btn-sun w-full text-xl" disabled={busy || !chosen.length || !supplier.trim() || chosen.some(([, l]) => !l.cost)} onClick={save}>
        {busy ? "لحظة..." : "حفظ الشراء"}
      </button>
    </div>
  );
}

function Suppliers() {
  const { data } = useQuery({ queryKey: ["suppliers"], queryFn: () => api<SupplierRow[]>("/suppliers") });
  const [paying, setPaying] = useState<SupplierRow | null>(null);
  if (!data) return <Skeleton h="h-60" />;
  if (!data.length) return <Empty icon={<Wallet size={44} />} title="ماكو موردين بعد" sub="يظهرون هنا بعد أول شراء" />;
  return (
    <>
      <ul className="grid gap-2">
        {data.map((s) => (
          <li key={s.id} className="panel flex items-center gap-3 p-3">
            <span className="flex-1 text-lg font-bold">{s.name}</span>
            {s.owed > 0 ? (
              <>
                <span className="text-left text-sm text-muted">
                  له علينا
                  <Money v={s.owed} className="num block text-xl text-debt" />
                </span>
                <button className="btn-sun min-h-[48px] px-4 text-base" onClick={() => setPaying(s)}>ادفع</button>
              </>
            ) : (
              <span className="font-semibold text-cash">صافي</span>
            )}
          </li>
        ))}
      </ul>
      <PaymentSheet party={paying} kind="supplier" onClose={() => setPaying(null)} />
    </>
  );
}
