"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, HandCoins, Search } from "lucide-react";
import { api, type CustomerRow } from "@/lib/api";
import { ago } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { CountUp, Empty, Money, PageTitle, Skeleton } from "@/components/ui";
import { PaymentSheet } from "@/components/PaymentSheet";

export default function DebtsPage() {
  return (
    <Shell>
      <Debts />
    </Shell>
  );
}

function Debts() {
  const { data } = useQuery({ queryKey: ["customers"], queryFn: () => api<CustomerRow[]>("/customers") });
  const [all, setAll] = useState(false);
  const [q, setQ] = useState("");
  const [paying, setPaying] = useState<CustomerRow | null>(null);

  const owing = (data ?? []).filter((c) => c.owed > 0).sort((a, b) => b.owed - a.owed);
  const total = owing.reduce((s, c) => s + c.owed, 0);
  const list = (all ? data ?? [] : owing).filter((c) => !q || c.name.includes(q.trim()));

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="الديون" sub="مين عليه فلوس، واستلام الدفعات" />

      <div className="panel trim-soft mb-4 p-5">
        <p className="label">مجموع الديون عند الزبائن</p>
        <CountUp v={total} money className="num big-money text-debt" />
        <p className="text-muted"><span dir="ltr">{owing.length}</span> زبون عليهم دين</p>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input className="field py-2.5 pr-10 text-base" placeholder="ابحث عن زبون" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="chip" aria-pressed={!all} onClick={() => setAll(false)}>عليهم دين</button>
        <button className="chip" aria-pressed={all} onClick={() => setAll(true)}>الكل</button>
      </div>

      {!data ? (
        <Skeleton h="h-60" />
      ) : list.length === 0 ? (
        <Empty icon={<HandCoins size={44} />} title={q ? "ماكو زبون بهذا الاسم" : "ماكو ديون"} sub={q ? undefined : "كل الزبائن حسابهم صافي"} />
      ) : (
        <ul className="grid gap-2">
          {list.map((c) => (
            <li key={c.id} className="panel flex items-center gap-3 p-3">
              <Link href={`/customers/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="num grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal/10 text-2xl text-teal">{c.name.charAt(0)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-bold">{c.name}</span>
                  {c.owed > 0 ? <Money v={c.owed} className="num text-xl text-debt" /> : <span className="font-semibold text-cash">صافي</span>}
                  <span className="block text-sm text-muted">آخر شراء {ago(c.lastSaleAt) || "—"}</span>
                </span>
              </Link>
              {c.owed > 0 ? (
                <button onClick={() => setPaying(c)} className="btn-sun min-h-[48px] px-4 text-base">استلام</button>
              ) : (
                <Link href={`/customers/${c.id}`} aria-label="التفاصيل" className="grid h-12 w-12 place-items-center text-muted">
                  <ChevronLeft />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <PaymentSheet party={paying} onClose={() => setPaying(null)} />
    </div>
  );
}
