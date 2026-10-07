"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Report } from "@/lib/api";
import { EXPENSE, dayLabel, todayKey } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { CountUp, Money, Num, PageTitle, Skeleton } from "@/components/ui";

type Period = { id: string; label: string; from: string; to: string };

function periods(): Period[] {
  const t = todayKey();
  const [y, m] = t.split("-").map(Number);
  const pad = (v: number) => String(v).padStart(2, "0");
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const lastOfPrev = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  return [
    { id: "today", label: "اليوم", from: t, to: t },
    { id: "yesterday", label: "أمس", from: todayKey(-1), to: todayKey(-1) },
    { id: "week", label: "آخر 7 أيام", from: todayKey(-6), to: t },
    { id: "month", label: "هذا الشهر", from: `${y}-${pad(m)}-01`, to: t },
    { id: "prev", label: "الشهر الماضي", from: `${prevY}-${pad(prevM)}-01`, to: `${prevY}-${pad(prevM)}-${pad(lastOfPrev)}` },
  ];
}

export default function ReportsPage() {
  return (
    <Shell roles={["OWNER", "SUPERVISOR"]}>
      <Reports />
    </Shell>
  );
}

function Reports() {
  const all = periods();
  const [pid, setPid] = useState("month");
  const p = all.find((x) => x.id === pid)!;
  const { data: r } = useQuery({ queryKey: ["report", p.from, p.to], queryFn: () => api<Report>(`/reports?from=${p.from}&to=${p.to}`) });

  return (
    <div>
      <PageTitle title="الحساب" sub="الربح، المبيعات، والمصاريف" />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {all.map((x) => (
          <button key={x.id} className="chip shrink-0" aria-pressed={pid === x.id} onClick={() => setPid(x.id)}>
            {x.label}
          </button>
        ))}
      </div>

      {!r ? (
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton h="h-64" /><Skeleton h="h-64" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="grid gap-4">
            <section className="panel trim-soft p-5">
              <p className="label">الربح</p>
              <CountUp v={r.profit} money className={`num big-money ${r.profit < 0 ? "text-debt" : "text-cash"}`} />
              <dl className="mt-4 grid gap-1.5 text-lg">
                <Row label="المبيعات" v={r.sales.total} />
                <Row label="كلفة البضاعة المباعة" v={-r.goodsCost} hint="حسب معدل سعر الشراء" />
                <Row label="المصاريف" v={-r.expenses.total} />
                <div className="mt-1 border-t-2 border-teal pt-1.5">
                  <Row label="الربح" v={r.profit} strong />
                </div>
              </dl>
            </section>

            {r.partner && (
              <section className="panel flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="label">حصة الشريك من مبيعات الثلج</p>
                  <p className="text-sm text-muted"><span dir="ltr">{r.partner.percent}%</span> من <Money v={r.sales.ice} /></p>
                </div>
                <Money v={r.partner.share} className="num text-3xl text-teal" />
              </section>
            )}

            <section className="panel p-5">
              <h2 className="num mb-3 text-2xl text-teal">الفلوس</h2>
              <dl className="grid gap-1.5 text-lg">
                <Row label="انقبض وقت البيع" v={r.sales.paidNow} />
                <Row label="انباع دين" v={r.sales.onCredit} tone="debt" />
                <Row label="ديون قديمة استلمناها" v={r.collected} tone="cash" />
                <Row label="مشتريات" v={r.purchases.total} hint={r.purchases.total > r.purchases.paid ? `دفعنا ${r.purchases.paid.toLocaleString("en-US")}` : undefined} />
              </dl>
            </section>

            <section className="panel p-5">
              <h2 className="num mb-3 text-2xl text-teal">الثلج</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Box label="انتاج" v={r.iceBlocks.produced} />
                <Box label="بيع" v={r.iceBlocks.sold} />
                <Box label="تالف" v={r.iceBlocks.wasted} tone="debt" />
              </div>
              <p className="mt-2 text-sm text-muted">بالقوالب. الثلج المجروش محسوب حسب كم قالب يستهلك.</p>
            </section>
          </div>

          <div className="grid gap-4">
            {r.byDay.length > 1 && <DayBars days={r.byDay} />}

            <section className="panel p-5">
              <h2 className="num mb-2 text-2xl text-teal">شنو انباع</h2>
              {r.byProduct.length === 0 ? (
                <p className="text-muted">ماكو مبيعات بهذه الفترة</p>
              ) : (
                <table className="w-full">
                  <tbody className="divide-y divide-line">
                    {r.byProduct.map((p) => (
                      <tr key={p.name}>
                        <td className="py-2 font-semibold">{p.name}</td>
                        <td className="py-2 text-center text-muted"><Num v={p.qty} /></td>
                        <td className="py-2 text-left"><Money v={p.total} className="font-bold" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {r.expenses.byCategory.length > 0 && (
              <section className="panel p-5">
                <h2 className="num mb-2 text-2xl text-teal">المصاريف</h2>
                <dl className="grid gap-1.5">
                  {r.expenses.byCategory.map((c) => (
                    <Row key={c.category} label={EXPENSE[c.category]} v={c.total} />
                  ))}
                </dl>
              </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="panel p-5">
                <h2 className="num mb-2 text-xl text-teal">البيع حسب العامل</h2>
                {r.byWorker.map((w) => (
                  <div key={w.name} className="flex justify-between py-1">
                    <span className="font-semibold">{w.name} <span className="text-sm text-muted">(<span dir="ltr">{w.count}</span>)</span></span>
                    <Money v={w.total} />
                  </div>
                ))}
                {!r.byWorker.length && <p className="text-muted">—</p>}
              </section>
              <section className="panel p-5">
                <h2 className="num mb-2 text-xl text-teal">أكثر الزبائن</h2>
                {r.topCustomers.map((c) => (
                  <div key={c.name} className="flex justify-between gap-2 py-1">
                    <span className="truncate font-semibold">{c.name}</span>
                    <Money v={c.total} />
                  </div>
                ))}
                {!r.topCustomers.length && <p className="text-muted">—</p>}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, v, hint, strong, tone }: { label: string; v: number; hint?: string; strong?: boolean; tone?: "debt" | "cash" }) {
  const color = tone === "debt" ? "text-debt" : tone === "cash" ? "text-cash" : v < 0 ? "text-debt" : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-bold text-teal" : "text-muted"}>
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className={`${color} ${strong ? "num text-2xl" : "font-bold"}`}>
        {v < 0 && "−"}
        <Money v={Math.abs(v)} />
      </dd>
    </div>
  );
}

function Box({ label, v, tone }: { label: string; v: number; tone?: "debt" }) {
  return (
    <div className="rounded-btn bg-ground p-3">
      <Num v={v} className={`num text-3xl ${tone === "debt" ? "text-debt" : "text-teal"}`} />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function DayBars({ days }: { days: Report["byDay"] }) {
  const max = Math.max(1, ...days.map((d) => d.sales));
  const shown = days.slice(-31);
  return (
    <section className="panel p-5">
      <h2 className="num mb-1 text-2xl text-teal">المبيعات يوم بيوم</h2>
      <p className="mb-3 text-sm text-muted">
        <span className="ml-3 inline-block h-2.5 w-2.5 rounded-sm bg-teal" /> مبيعات
        <span className="mx-3 inline-block h-2.5 w-2.5 rounded-sm bg-debt/70" /> مصاريف
      </p>
      <div className="flex h-40 items-end gap-[3px]" dir="ltr">
        {shown.map((d, i) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end gap-[1px]" title={`${dayLabel(d.day)}: ${d.sales.toLocaleString("en-US")}`}>
            <div className="grow w-full rounded-t-sm bg-teal" style={{ height: `${(d.sales / max) * 100}%`, animationDelay: `${i * 15}ms` }} />
            {d.expenses > 0 && <div className="grow absolute bottom-0 left-1/4 w-1/2 rounded-t-sm bg-debt/70" style={{ height: `${Math.min(100, (d.expenses / max) * 100)}%` }} />}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted" dir="ltr">
        <span>{shown[0].day.slice(5).split("-").reverse().join("/")}</span>
        <span>{shown[shown.length - 1].day.slice(5).split("-").reverse().join("/")}</span>
      </div>
    </section>
  );
}
