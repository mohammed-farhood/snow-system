"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Flame, Droplets, Users, Wrench, MoreHorizontal, Zap } from "lucide-react";
import { post } from "@/lib/api";
import { EXPENSE } from "@/lib/format";
import { AmountField, Done, ErrorLine, Money, Sheet, Stepper } from "./ui";

function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function ProductionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [blocks, setBlocks] = useState(0);
  const [wasted, setWasted] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const refresh = useRefresh();

  const close = () => {
    onClose();
    setTimeout(() => {
      setBlocks(0);
      setWasted(0);
      setDone(null);
      setError(null);
    }, 250);
  };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await post("/production", { blocks, wasted });
      setDone(blocks);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="تسجيل إنتاج">
      {done !== null ? (
        <Done title="تم الحفظ" sub={<>أضفنا <span dir="ltr">{done}</span> قالب للمخزن</>}>
          <button className="btn-teal" onClick={close}>تمام</button>
        </Done>
      ) : (
        <div className="grid gap-5">
          <div className="panel flex flex-col items-center gap-3 p-5">
            <p className="text-lg font-bold text-teal">كم قالب طلع؟</p>
            <Stepper big value={blocks} onChange={setBlocks} label="عدد القوالب" />
            <div className="flex flex-wrap justify-center gap-2">
              {[10, 25, 50, 100].map((q) => (
                <button key={q} className="chip" onClick={() => setBlocks(blocks + q)}>
                  <span dir="ltr">+{q}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="panel flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold text-teal">تالف</p>
              <p className="text-sm text-muted">قوالب انكسرت أو ذابت</p>
            </div>
            <Stepper value={wasted} onChange={setWasted} label="التالف" />
          </div>
          <ErrorLine msg={error} />
          <button className="btn-sun w-full text-xl" disabled={busy || (blocks === 0 && wasted === 0)} onClick={save}>
            {busy ? "لحظة..." : "حفظ"}
          </button>
        </div>
      )}
    </Sheet>
  );
}

const CATS: { id: string; icon: React.ReactNode }[] = [
  { id: "GAS", icon: <Flame size={26} /> },
  { id: "ELECTRICITY", icon: <Zap size={26} /> },
  { id: "WATER", icon: <Droplets size={26} /> },
  { id: "SALARY", icon: <Users size={26} /> },
  { id: "MAINTENANCE", icon: <Wrench size={26} /> },
  { id: "OTHER", icon: <MoreHorizontal size={26} /> },
];

export function ExpenseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cat, setCat] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const refresh = useRefresh();

  const close = () => {
    onClose();
    setTimeout(() => {
      setCat(null);
      setAmount(0);
      setNote("");
      setDone(false);
      setError(null);
    }, 250);
  };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await post("/expenses", { category: cat, amount, note: note.trim() || null });
      setDone(true);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="مصروف">
      {done ? (
        <Done title="انحفظ المصروف" sub={<Money v={amount} />}>
          <button className="btn-teal" onClick={close}>تمام</button>
        </Done>
      ) : (
        <div className="grid gap-5">
          <div className="grid grid-cols-3 gap-2">
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={`flex flex-col items-center gap-1 rounded-btn border-2 p-3 font-bold transition-colors ${cat === c.id ? "border-teal bg-teal text-white" : "border-line bg-paper text-teal"}`}
              >
                {c.icon}
                {EXPENSE[c.id]}
              </button>
            ))}
          </div>
          <AmountField label="المبلغ" value={amount} onChange={setAmount} quick={[5000, 10000, 25000, 50000]} />
          <input className="field" placeholder="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />
          <ErrorLine msg={error} />
          <button className="btn-sun w-full text-xl" disabled={busy || !cat || !amount} onClick={save}>
            {busy ? "لحظة..." : "حفظ المصروف"}
          </button>
        </div>
      )}
    </Sheet>
  );
}

