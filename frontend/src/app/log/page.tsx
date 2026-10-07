"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { api, type Activity } from "@/lib/api";
import { dayLabel, todayKey } from "@/lib/format";
import { Shell, useMe } from "@/components/Shell";
import { ActivityRow } from "@/components/ActivityRow";
import { Empty, Money, PageTitle, Skeleton } from "@/components/ui";

const FILTERS: { id: Activity["type"] | "all"; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "sale", label: "بيع" },
  { id: "production", label: "إنتاج" },
  { id: "payment", label: "دفعات" },
  { id: "expense", label: "مصاريف" },
  { id: "purchase", label: "مشتريات" },
];

export default function LogPage() {
  return (
    <Shell>
      <Log />
    </Shell>
  );
}

function Log() {
  const me = useMe();
  const manager = me?.role !== "WORKER";
  const [offset, setOffset] = useState(0);
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("all");
  const day = todayKey(offset);
  const { data } = useQuery({ queryKey: ["activity", day], queryFn: () => api<Activity[]>(`/activity?day=${day}`) });

  const list = (data ?? []).filter((a) => f === "all" || a.type === f);
  const sold = (data ?? []).filter((a) => a.type === "sale").reduce((s, a) => s + (a.amount ?? 0), 0);
  const filters = FILTERS.filter((x) => manager || !["expense", "purchase"].includes(x.id));

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="السجل" sub={manager ? "كل شي انسجّل، يوم بيوم" : "اللي سجّلته أنت"} />

      <div className="panel mb-3 flex items-center justify-between p-2">
        <button aria-label="اليوم السابق" onClick={() => setOffset(offset - 1)} className="grid h-12 w-12 place-items-center rounded-full text-teal hover:bg-teal/5">
          <ChevronRight size={26} />
        </button>
        <div className="text-center">
          <p className="num text-2xl text-teal">{dayLabel(day)}</p>
          {data && (
            <p className="text-sm text-muted">
              مبيعات <Money v={sold} className="font-bold" />
            </p>
          )}
        </div>
        <button aria-label="اليوم التالي" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} className="grid h-12 w-12 place-items-center rounded-full text-teal hover:bg-teal/5 disabled:opacity-25">
          <ChevronLeft size={26} />
        </button>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map((x) => (
          <button key={x.id} className="chip shrink-0" aria-pressed={f === x.id} onClick={() => setF(x.id)}>
            {x.label}
          </button>
        ))}
      </div>

      {!data ? (
        <Skeleton h="h-72" />
      ) : list.length === 0 ? (
        <Empty icon={<ClipboardList size={44} />} title="ماكو شي بهذا اليوم" />
      ) : (
        <ul className="panel divide-y divide-line px-4">
          {list.map((a) => (
            <ActivityRow key={`${a.type}-${a.id}`} a={a} showBy={manager} />
          ))}
        </ul>
      )}
    </div>
  );
}
