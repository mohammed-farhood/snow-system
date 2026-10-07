"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, Factory, HandCoins, Package, ShoppingBasket, Wallet } from "lucide-react";
import { api, type Activity, type Product, type Today } from "@/lib/api";
import { fullDay, shortDay, todayKey } from "@/lib/format";
import { Shell, useMe } from "@/components/Shell";
import { CountUp, Empty, Money, Skeleton } from "@/components/ui";
import { ActivityRow } from "@/components/ActivityRow";
import { ExpenseSheet, ProductionSheet } from "@/components/QuickSheets";

export default function HomePage() {
  return (
    <Shell>
      <Home />
    </Shell>
  );
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Baghdad" }).format(new Date()));
  return h < 12 ? "صباح الخير" : "مساء الخير";
}

function Home() {
  const me = useMe();
  const manager = me?.role !== "WORKER";
  const [sheet, setSheet] = useState<"production" | "expense" | null>(null);
  const { data: t } = useQuery({ queryKey: ["today"], queryFn: () => api<Today>("/today"), refetchInterval: 60_000 });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api<Product[]>("/products") });
  const { data: acts } = useQuery({ queryKey: ["activity", todayKey()], queryFn: () => api<Activity[]>("/activity") });
  const ice = products?.filter((p) => p.kind === "ICE" && p.isActive) ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      <div className="grid gap-4">
        <div>
          <h1 className="num text-3xl text-teal">
            {greeting()}، {me?.name}
          </h1>
          <p className="text-muted">{fullDay(todayKey())}</p>
        </div>

        {/* The one bold thing: the sell panel */}
        <div className="relative overflow-hidden rounded-[20px] bg-sun text-teal shadow-[inset_0_-6px_0_var(--sun-deep)]">
          <div className="trim absolute inset-y-0 left-0 w-3 opacity-90" />
          <Link href="/sell" className="flex items-center gap-4 p-5 pl-8">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-teal text-sun">
              <ShoppingBasket size={34} strokeWidth={2.2} />
            </span>
            <span className="flex-1">
              <span className="num block text-5xl">بيع</span>
              <span className="font-semibold">ثلج وبضاعة بوصل واحد</span>
            </span>
            <ChevronLeft size={32} />
          </Link>
          {ice.length > 0 && (
            <div className="flex gap-2 px-5 pb-5 pl-8">
              {ice.map((p) => (
                <Link key={p.id} href={`/sell?add=${p.id}`} className="flex-1 rounded-btn bg-white/70 px-3 py-2 text-center font-bold transition-transform active:scale-95">
                  <span className="block">+ {p.name}</span>
                  <Money v={p.price} className="text-sm font-semibold text-teal/70" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={`grid gap-3 ${manager ? "grid-cols-3" : "grid-cols-2"}`}>
          <Action icon={<Factory size={26} />} label="إنتاج" onClick={() => setSheet("production")} />
          <Action icon={<HandCoins size={26} />} label="استلام دين" href="/debts" />
          {manager && <Action icon={<Wallet size={26} />} label="مصروف" onClick={() => setSheet("expense")} />}
        </div>

        {t && me?.role === "OWNER" && t.iceStock === 0 && !t.week?.some((d) => d.total > 0) && (
          <FirstSteps onProduction={() => setSheet("production")} />
        )}

        {!t ? (
          <Skeleton h="h-40" />
        ) : manager ? (
          <ManagerNumbers t={t} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="معك نقد اليوم" big>
              <CountUp v={t.mine.cashTaken} money className="num text-3xl text-teal" />
              <p className="text-sm text-muted"><span dir="ltr">{t.mine.salesCount}</span> بيعة</p>
            </Stat>
            <Stat label="ثلج بالمخزن">
              <CountUp v={t.iceStock} className="num text-4xl text-teal" /> <span className="text-muted">قالب</span>
              <p className="text-sm text-muted">انتجنا اليوم <span dir="ltr">{t.producedToday}</span></p>
            </Stat>
          </div>
        )}
      </div>

      <section className="panel p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="num text-2xl text-teal">{manager ? "شنو صار اليوم" : "شغلك اليوم"}</h2>
          <Link href="/log" className="flex items-center font-semibold text-teal">
            الكل <ChevronLeft size={18} />
          </Link>
        </div>
        {!acts ? (
          <Skeleton />
        ) : acts.length === 0 ? (
          <Empty icon={<ShoppingBasket size={40} />} title="ماكو شي بعد" sub="أول بيعة اليوم تطلع هنا" />
        ) : (
          <ul className="divide-y divide-line">
            {acts.slice(0, 6).map((a) => (
              <ActivityRow key={`${a.type}-${a.id}`} a={a} showBy={manager} />
            ))}
          </ul>
        )}
      </section>

      <ProductionSheet open={sheet === "production"} onClose={() => setSheet(null)} />
      <ExpenseSheet open={sheet === "expense"} onClose={() => setSheet(null)} />
    </div>
  );
}

function ManagerNumbers({ t }: { t: Today }) {
  const max = Math.max(1, ...(t.week ?? []).map((d) => d.total));
  return (
    <div className="grid gap-3">
      <div className="panel trim-soft p-5">
        <p className="label">بالصندوق اليوم</p>
        <CountUp v={t.drawer ?? 0} money className={`num big-money ${(t.drawer ?? 0) < 0 ? "text-debt" : "text-teal"}`} />
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="text-cash">دخل <Money v={t.cashIn ?? 0} className="font-bold" /></span>
          <span className="text-debt">طلع <Money v={t.cashOut ?? 0} className="font-bold" /></span>
          <span className="text-muted">مبيعات اليوم <Money v={t.salesTotal ?? 0} className="font-bold" /></span>
        </div>
        {t.week && t.week.some((d) => d.total > 0) && (
          <div className="mt-4 flex h-20 items-end gap-2" aria-label="مبيعات آخر 7 أيام">
            {t.week.map((d, i) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`grow w-full rounded-t-md ${i === 6 ? "bg-sun" : "bg-teal/25"}`}
                  style={{ height: `${Math.max(4, (d.total / max) * 64)}px`, animationDelay: `${i * 40}ms` }}
                  title={String(d.total)}
                />
                <span className="text-[11px] leading-none text-muted">{i === 6 ? "اليوم" : shortDay(d.day).replace("ال", "")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/debts">
          <Stat label="ديون لنا عند الزبائن">
            <CountUp v={t.owedToUs ?? 0} money className="num text-2xl text-debt" />
            <p className="text-sm text-muted"><span dir="ltr">{t.debtors}</span> زبون</p>
          </Stat>
        </Link>
        <Stat label="ثلج بالمخزن">
          <CountUp v={t.iceStock} className="num text-3xl text-teal" /> <span className="text-muted">قالب</span>
          <p className="text-sm text-muted">
            انتاج <span dir="ltr">{t.producedToday}</span>، بيع <span dir="ltr">{t.iceSoldToday}</span>
          </p>
        </Stat>
      </div>
      {t.lowStock && t.lowStock.length > 0 && (
        <div className="panel flex items-start gap-3 border-sun-deep bg-sun/15 p-4">
          <AlertTriangle className="mt-1 shrink-0 text-sun-deep" />
          <div>
            <p className="font-bold text-teal">بضاعة قربت تخلص</p>
            <p className="text-sm text-ink">
              {t.lowStock.slice(0, 4).map((p, i) => (
                <span key={p.id}>
                  {i > 0 && "، "}
                  {p.name} ({p.stock <= 0 ? "خلصت" : <span dir="ltr">{p.stock}</span>})
                </span>
              ))}
            </p>
            <Link href="/money?tab=purchase" className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-teal">
              <Package size={16} /> سجّل شراء
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Brand-new factory: the three things to do before the first sale. */
function FirstSteps({ onProduction }: { onProduction: () => void }) {
  const steps: { n: number; title: string; sub: string; href?: string; onClick?: () => void }[] = [
    { n: 1, title: "ضيف العمال", sub: "كل واحد ياخذ رمز من 4 أرقام", href: "/settings" },
    { n: 2, title: "تأكد من الأسعار", sub: "سعر القالب والمجروش، وضيف البضاعة", href: "/settings" },
    { n: 3, title: "سجّل إنتاج اليوم", sub: "حتى يصير عندك ثلج بالمخزن", onClick: onProduction },
  ];
  return (
    <section className="panel border-sun-deep p-5">
      <h2 className="num text-2xl text-teal">نبدأ؟</h2>
      <p className="mb-3 text-muted">ثلاث خطوات وتكون جاهز للبيع</p>
      <ol className="grid gap-2">
        {steps.map((s) => {
          const body = (
            <>
              <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun text-xl text-teal">{s.n}</span>
              <span className="flex-1 text-right">
                <span className="block font-bold text-teal">{s.title}</span>
                <span className="text-sm text-muted">{s.sub}</span>
              </span>
              <ChevronLeft className="text-muted" />
            </>
          );
          const cls = "flex w-full items-center gap-3 rounded-btn bg-ground p-3 transition-transform active:scale-[0.98]";
          return (
            <li key={s.n}>
              {s.href ? <Link href={s.href} className={cls}>{body}</Link> : <button onClick={s.onClick} className={cls}>{body}</button>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Stat({ label, children, big }: { label: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className={`panel h-full p-4 ${big ? "trim-soft" : ""}`}>
      <p className="label">{label}</p>
      {children}
    </div>
  );
}

function Action({ icon, label, href, onClick }: { icon: React.ReactNode; label: string; href?: string; onClick?: () => void }) {
  const cls = "panel flex flex-col items-center gap-1 py-4 font-bold text-teal transition-transform active:scale-95";
  return href ? (
    <Link href={href} className={cls}>
      {icon}
      {label}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}
