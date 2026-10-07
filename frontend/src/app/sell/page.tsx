"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Printer, Search, ShoppingBasket, Snowflake, Trash2, UserRound } from "lucide-react";
import { api, post, type CustomerRow, type Product, type Sale } from "@/lib/api";
import { n } from "@/lib/format";
import { printReceipt } from "@/lib/receipt";
import { Shell } from "@/components/Shell";
import { AmountField, Done, Empty, ErrorLine, Money, PageTitle, Sheet, Skeleton, Stepper } from "@/components/ui";

export default function SellPage() {
  return (
    <Shell>
      <Suspense>
        <Sell />
      </Suspense>
    </Shell>
  );
}

type Cart = Record<number, number>;
type Pay = "full" | "debt" | "part";

function Sell() {
  const params = useSearchParams();
  const qc = useQueryClient();
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api<Product[]>("/products") });
  const [cart, setCart] = useState<Cart>({});
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState<Sale | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const add = Number(params.get("add"));
    if (add) setCart({ [add]: 1 });
  }, [params]);

  const active = products?.filter((p) => p.isActive) ?? [];
  const ice = active.filter((p) => p.kind === "ICE");
  const goods = active.filter((p) => p.kind === "GOODS" && (!q || p.name.includes(q.trim())));
  const lines = active.filter((p) => cart[p.id] > 0);
  const total = lines.reduce((s, p) => s + p.price * cart[p.id], 0);
  const count = lines.reduce((s, p) => s + cart[p.id], 0);
  const set = (id: number, v: number) => setCart((c) => ({ ...c, [id]: Math.max(0, v) }));

  if (done) {
    const owed = done.total - done.paid;
    return (
      <Done
        title="تم البيع"
        sub={
          <>
            وصل رقم <span dir="ltr">{done.receiptNo}</span>، المجموع <Money v={done.total} className="font-bold text-teal" />
            {owed > 0 && (
              <p className="mt-1 font-bold text-debt">
                صار دين على {done.customer?.name}: <Money v={owed} />
              </p>
            )}
          </>
        }
      >
        <button className="btn-sun text-xl" onClick={() => { setDone(null); setCart({}); }}>
          <ShoppingBasket /> بيعة جديدة
        </button>
        <button className="btn-ghost" onClick={() => printReceipt(done)}>
          <Printer /> طباعة وصل
        </button>
        <Link href="/" className="btn-ghost">الرئيسية</Link>
      </Done>
    );
  }

  return (
    <div className={`lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6 ${count ? "pb-24 lg:pb-0" : ""}`}>
      <div>
        <PageTitle title="بيع" sub="اختر الكمية، وبعدين الدفع" />
        {!products ? (
          <div className="grid gap-3"><Skeleton h="h-32" /><Skeleton h="h-32" /></div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {ice.map((p) => (
                <div key={p.id} className={`panel p-4 transition-colors ${cart[p.id] ? "border-teal" : ""}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-xl font-bold text-teal">
                      <Snowflake size={20} /> {p.name}
                    </p>
                    <Money v={p.price} className="font-bold text-ink" />
                  </div>
                  <p className={`text-sm ${p.stock <= 0 ? "text-debt" : "text-muted"}`}>
                    بالمخزن <span dir="ltr">{n(p.stock)}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <Stepper big value={cart[p.id] ?? 0} onChange={(v) => set(p.id, v)} label={`عدد ${p.name}`} />
                    <div className="flex gap-2">
                      {[5, 10].map((q) => (
                        <button key={q} className="chip" onClick={() => set(p.id, (cart[p.id] ?? 0) + q)}>
                          <span dir="ltr">+{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(goods.length > 0 || q) && (
              <>
                <div className="mb-3 mt-6 flex items-center justify-between gap-3">
                  <h2 className="num text-2xl text-teal">بضاعة</h2>
                  {active.filter((p) => p.kind === "GOODS").length > 8 && (
                    <label className="relative max-w-[60%] flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <input className="field py-2 pr-10 text-base" placeholder="ابحث" value={q} onChange={(e) => setQ(e.target.value)} />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {goods.map((p) => {
                    const c = cart[p.id] ?? 0;
                    return (
                      <div key={p.id} className={`panel relative overflow-hidden transition-colors ${c ? "border-teal" : ""}`}>
                        <button onClick={() => set(p.id, c + 1)} className="block w-full p-3 text-right active:bg-sun/20">
                          <p className="font-bold leading-snug text-ink">{p.name}</p>
                          <Money v={p.price} className="text-sm font-semibold text-teal" />
                          <p className={`text-xs ${p.stock <= 0 ? "font-bold text-debt" : "text-muted"}`}>
                            {p.stock <= 0 ? "خلصت" : <>باقي <span dir="ltr">{p.stock}</span> {p.unit}</>}
                          </p>
                        </button>
                        {c > 0 && (
                          <div className="fade flex items-center justify-between border-t-2 border-line bg-ground px-2 py-1">
                            <button aria-label="إنقاص" onClick={() => set(p.id, c - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-paper text-teal">
                              <Minus size={18} />
                            </button>
                            <span key={c} className="num bump text-2xl text-teal" dir="ltr">{c}</span>
                            <button aria-label="زيادة" onClick={() => set(p.id, c + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-teal text-white">
                              <Plus size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {goods.length === 0 && <p className="py-6 text-center text-muted">ماكو بضاعة بهذا الاسم</p>}
              </>
            )}
          </>
        )}
      </div>

      {/* Desktop: the basket always visible */}
      <aside className="panel sticky top-24 hidden p-4 lg:block">
        <Basket lines={lines} cart={cart} total={total} onRemove={(id) => set(id, 0)} />
        <button className="btn-sun mt-4 w-full text-xl" disabled={!count} onClick={() => setCheckout(true)}>
          الدفع
        </button>
      </aside>

      {/* Phone: total bar above the bottom nav */}
      {count > 0 && (
        <div className="fade fixed inset-x-0 bottom-[84px] z-20 px-4 lg:hidden">
          <button onClick={() => setCheckout(true)} className="btn-teal mx-auto flex w-full max-w-md justify-between px-5 text-xl">
            <span>
              الدفع <span className="text-base font-semibold text-white/70">(<span dir="ltr">{count}</span>)</span>
            </span>
            <Money v={total} className="num text-2xl text-sun" />
          </button>
        </div>
      )}

      <Checkout
        open={checkout}
        onClose={() => setCheckout(false)}
        lines={lines}
        cart={cart}
        total={total}
        onRemove={(id) => set(id, 0)}
        onDone={(s) => {
          setCheckout(false);
          setDone(s);
          qc.invalidateQueries();
          window.scrollTo({ top: 0 });
        }}
      />
    </div>
  );
}

function Basket({ lines, cart, total, onRemove }: { lines: Product[]; cart: Cart; total: number; onRemove: (id: number) => void }) {
  if (!lines.length) return <Empty icon={<ShoppingBasket size={36} />} title="السلة فارغة" sub="اضغط على أي مادة" />;
  return (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-2">
            <button onClick={() => onRemove(p.id)} aria-label={`حذف ${p.name}`} className="grid h-9 w-9 place-items-center rounded-full text-debt hover:bg-debt/10">
              <Trash2 size={18} />
            </button>
            <span className="flex-1 font-semibold">
              {p.name} <span className="text-muted">× <span dir="ltr">{cart[p.id]}</span></span>
            </span>
            <Money v={p.price * cart[p.id]} className="font-bold" />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t-2 border-teal pt-2">
        <span className="text-lg font-bold text-teal">المجموع</span>
        <Money v={total} className="num text-3xl text-teal" />
      </div>
    </div>
  );
}

function Checkout(props: {
  open: boolean;
  onClose: () => void;
  lines: Product[];
  cart: Cart;
  total: number;
  onRemove: (id: number) => void;
  onDone: (s: Sale) => void;
}) {
  const { open, onClose, lines, cart, total } = props;
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => api<CustomerRow[]>("/customers"), enabled: open });
  const [name, setName] = useState("");
  const [pay, setPay] = useState<Pay>("full");
  const [part, setPart] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
    } else {
      setName("");
      setPay("full");
      setPart(0);
      setNote("");
    }
  }, [open]);

  const suggestions = useMemo(() => {
    const all = customers ?? [];
    const t = name.trim();
    if (!t) return all.slice(0, 6);
    return all.filter((c) => c.name.includes(t) && c.name !== t).slice(0, 6);
  }, [customers, name]);
  const known = customers?.find((c) => c.name === name.trim());
  const paid = pay === "full" ? total : pay === "debt" ? 0 : Math.min(part, total);
  const needsName = paid < total && !name.trim();

  const submit = async () => {
    if (needsName) return setError("اكتب اسم الزبون حتى نسجّل عليه الدين");
    setBusy(true);
    setError(null);
    try {
      const sale = await post<Sale>("/sales", {
        items: lines.map((p) => ({ productId: p.id, quantity: cart[p.id] })),
        customerName: name.trim() || null,
        paid,
        note: note.trim() || null,
      });
      props.onDone(sale);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="الدفع">
      <div className="grid gap-5">
        <div className="panel p-3 lg:hidden">
          <Basket lines={lines} cart={cart} total={total} onRemove={props.onRemove} />
        </div>

        <div>
          <p className="label mb-1">الزبون</p>
          <div className="relative">
            <UserRound className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input className="field pr-11" placeholder="نقدي (بدون اسم)" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {known && known.owed > 0 && (
            <p className="mt-1 text-sm font-semibold text-debt">
              عليه دين سابق <Money v={known.owed} />
            </p>
          )}
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((c) => (
                <button key={c.id} className="chip" onClick={() => setName(c.name)}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="label mb-1">الدفع</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["full", "دفع كامل"],
                ["debt", "دين"],
                ["part", "دفع جزء"],
              ] as [Pay, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={pay === id}
                onClick={() => setPay(id)}
                className={`min-h-[52px] rounded-btn border-2 font-bold transition-colors ${
                  pay === id ? (id === "full" ? "border-cash bg-cash text-white" : "border-debt bg-debt text-white") : "border-line bg-paper text-teal"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {pay === "part" && (
            <div className="fade mt-3">
              <AmountField label="كم دفع؟" value={part} onChange={setPart} quick={[5000, 10000, 25000].filter((v) => v < total)} />
              <p className="mt-1 text-sm font-semibold text-debt">
                يبقى عليه <Money v={Math.max(0, total - part)} />
              </p>
            </div>
          )}
        </div>

        <input className="field text-base" placeholder="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />

        <ErrorLine msg={error} />
        <button className="btn-sun w-full justify-between px-6 text-xl" disabled={busy || !lines.length} onClick={submit}>
          <span>{busy ? "لحظة..." : "سجّل البيع"}</span>
          <Money v={total} className="num text-2xl" />
        </button>
      </div>
    </Sheet>
  );
}
