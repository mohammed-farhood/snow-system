"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Factory, HandCoins, Printer, ShoppingBasket, Truck, Undo2, Wallet } from "lucide-react";
import { api, del, type Activity, type Sale } from "@/lib/api";
import { time } from "@/lib/format";
import { printReceipt } from "@/lib/receipt";
import { Money } from "./ui";

const ICON: Record<Activity["type"], React.ReactNode> = {
  sale: <ShoppingBasket size={20} />,
  production: <Factory size={20} />,
  expense: <Wallet size={20} />,
  payment: <HandCoins size={20} />,
  purchase: <Truck size={20} />,
};
const TINT: Record<Activity["type"], string> = {
  sale: "bg-sun/40 text-teal",
  production: "bg-teal/10 text-teal",
  expense: "bg-debt/10 text-debt",
  payment: "bg-cash/10 text-cash",
  purchase: "bg-debt/10 text-debt",
};

export function ActivityRow({ a, showBy = true }: { a: Activity; showBy?: boolean }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const undo = async () => {
    setBusy(true);
    try {
      await del(`/activity/${a.type}/${a.id}`);
      qc.invalidateQueries();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  const print = () => printReceipt(() => api<Sale>(`/sales/${a.id}`));

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${TINT[a.type]}`}>{ICON[a.type]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-bold text-ink">{a.title}</p>
            {a.amount !== null && <Money v={Math.abs(a.amount)} className={`shrink-0 font-bold ${a.amount < 0 ? "text-debt" : "text-teal"}`} />}
          </div>
          <div className="flex items-baseline justify-between gap-2 text-sm text-muted">
            <p className="truncate">
              {a.detail}
              {a.detail && showBy ? "، " : ""}
              {showBy ? a.by.name : ""}
            </p>
            <span dir="ltr" className="shrink-0">{time(a.at)}</span>
          </div>
          {a.owed > 0 && (
            <p className="mt-1 inline-block rounded-full bg-debt/10 px-2.5 text-sm font-semibold text-debt">
              {a.type === "purchase" ? "باقي علينا" : "دين"} <Money v={a.owed} />
            </p>
          )}
          {(a.canUndo || a.type === "sale") && !confirm && (
            <div className="mt-1.5 flex gap-2">
              {a.type === "sale" && (
                <button onClick={print} className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-teal hover:bg-teal/5">
                  <Printer size={16} /> وصل
                </button>
              )}
              {a.canUndo && (
                <button onClick={() => setConfirm(true)} className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-debt hover:bg-debt/5">
                  <Undo2 size={16} /> تراجع
                </button>
              )}
            </div>
          )}
          {confirm && (
            <div className="fade mt-2 flex items-center gap-2 rounded-btn bg-debt/10 p-2">
              <p className="flex-1 text-sm font-semibold text-debt">{err ?? "نحذفها؟"}</p>
              <button onClick={undo} disabled={busy} className="rounded-full bg-debt px-4 py-1.5 text-sm font-bold text-white">
                نعم، احذف
              </button>
              <button onClick={() => { setConfirm(false); setErr(null); }} className="rounded-full bg-paper px-4 py-1.5 text-sm font-bold text-teal">
                لا
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
