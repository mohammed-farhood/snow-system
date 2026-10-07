"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Pencil, Phone, Printer, ShoppingBasket } from "lucide-react";
import { api, put, type CustomerDetail } from "@/lib/api";
import { dayLabel, dateOf, time } from "@/lib/format";
import { printReceipt } from "@/lib/receipt";
import { Shell, useMe } from "@/components/Shell";
import { ErrorLine, Money, Sheet, Skeleton } from "@/components/ui";
import { PaymentSheet } from "@/components/PaymentSheet";

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Shell>
      <Customer id={Number(id)} />
    </Shell>
  );
}

function Customer({ id }: { id: number }) {
  const me = useMe();
  const { data: c } = useQuery({ queryKey: ["customer", id], queryFn: () => api<CustomerDetail>(`/customers/${id}`) });
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!c) return <Skeleton h="h-80" />;

  const timeline = [
    ...c.sales.map((s) => ({ kind: "sale" as const, at: s.date, s })),
    ...c.payments.map((p) => ({ kind: "pay" as const, at: p.date, p })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  let lastDay = "";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="panel trim-soft mb-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="num text-3xl text-teal">{c.name}</h1>
            {c.phone && (
              <a href={`tel:${c.phone}`} dir="ltr" className="inline-flex items-center gap-1 font-semibold text-teal">
                <Phone size={16} /> {c.phone}
              </a>
            )}
          </div>
          {me?.role !== "WORKER" && (
            <button onClick={() => setEditing(true)} aria-label="تعديل" className="grid h-11 w-11 place-items-center rounded-full bg-paper text-teal">
              <Pencil size={18} />
            </button>
          )}
        </div>
        <p className="label mt-3">{c.owed > 0 ? "عليه" : "الحساب"}</p>
        {c.owed > 0 ? <Money v={c.owed} className="num big-money text-debt" /> : <p className="num text-4xl text-cash">صافي</p>}
        {c.owed > 0 && (
          <button className="btn-sun mt-4 w-full sm:w-auto" onClick={() => setPaying(true)}>
            <HandCoins /> استلام دفعة
          </button>
        )}
      </div>

      <h2 className="num mb-2 text-2xl text-teal">الحركات</h2>
      <ul className="panel divide-y divide-line px-4">
        {timeline.length === 0 && <li className="py-6 text-center text-muted">ماكو حركات</li>}
        {timeline.map((t) => {
          const d = dateOf(t.at);
          const head = d !== lastDay ? (lastDay = d) : null;
          return (
            <li key={`${t.kind}-${t.kind === "sale" ? t.s.id : t.p.id}`} className="py-3">
              {head && <p className="mb-1 text-sm font-bold text-muted">{dayLabel(head)}</p>}
              {t.kind === "sale" ? (
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun/40 text-teal"><ShoppingBasket size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="truncate font-bold">{t.s.items.map((i) => `${i.quantity} ${i.product.name}`).join("، ")}</p>
                      <Money v={t.s.total} className="font-bold" />
                    </div>
                    <div className="flex justify-between gap-2 text-sm text-muted">
                      <span>
                        وصل <span dir="ltr">{t.s.receiptNo}</span>، {t.s.createdBy.name}
                        {t.s.total > t.s.paid && <span className="font-semibold text-debt">، دين <Money v={t.s.total - t.s.paid} /></span>}
                      </span>
                      <span dir="ltr">{time(t.s.date)}</span>
                    </div>
                    <button onClick={() => printReceipt(t.s)} className="mt-1 flex items-center gap-1 text-sm font-semibold text-teal">
                      <Printer size={15} /> وصل
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cash/10 text-cash"><HandCoins size={20} /></span>
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="font-bold text-cash">دفعة</p>
                      <Money v={t.p.amount} className="font-bold text-cash" />
                    </div>
                    <div className="flex justify-between text-sm text-muted">
                      <span>استلمها {t.p.createdBy.name}</span>
                      <span dir="ltr">{time(t.p.date)}</span>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <PaymentSheet party={paying ? c : null} onClose={() => setPaying(false)} />
      <EditSheet open={editing} onClose={() => setEditing(false)} c={c} />
    </div>
  );
}

function EditSheet({ open, onClose, c }: { open: boolean; onClose: () => void; c: CustomerDetail }) {
  const qc = useQueryClient();
  const [name, setName] = useState(c.name);
  const [phone, setPhone] = useState(c.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await put(`/customers/${c.id}`, { name, phone: phone || null });
      qc.invalidateQueries();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="تعديل الزبون">
      <div className="grid gap-4">
        <label>
          <span className="label">الاسم</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span className="label">الهاتف</span>
          <input className="field" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07..." />
        </label>
        <ErrorLine msg={error} />
        <button className="btn-sun" onClick={save}>حفظ</button>
      </div>
    </Sheet>
  );
}
