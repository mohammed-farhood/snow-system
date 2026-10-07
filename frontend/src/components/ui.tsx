"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { n } from "@/lib/format";

/** Amount in dinars, kept left-to-right inside Arabic text. */
export function Money({ v, className = "" }: { v: number; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${className}`}>
      <bdi dir="ltr">
        {v < 0 ? "−" : ""}
        {n(Math.abs(v))}
      </bdi>
      <span className="text-[0.7em]">د.ع</span>
    </span>
  );
}

export function Num({ v, className = "" }: { v: number; className?: string }) {
  return (
    <span dir="ltr" className={`inline-block ${className}`}>
      {n(v)}
    </span>
  );
}

/** Counts up from the previous value to the new one. */
export function CountUp({ v, money = false, className = "" }: { v: number; money?: boolean; className?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (v - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = v;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return money ? <Money v={shown} className={className} /> : <Num v={shown} className={className} />;
}

/** Big − number + control; the number bumps on every change. */
export function Stepper({
  value,
  onChange,
  min = 0,
  big = false,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  big?: boolean;
  label: string;
}) {
  const [k, setK] = useState(0);
  const set = (v: number) => {
    onChange(Math.max(min, v));
    setK((x) => x + 1);
  };
  const size = big ? "h-16 w-16" : "h-12 w-12";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" aria-label="زيادة" onClick={() => set(value + 1)} className={`${size} grid place-items-center rounded-full bg-teal text-white active:scale-90 transition-transform`}>
        <Plus size={big ? 28 : 22} strokeWidth={3} />
      </button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        onChange={(e) => {
          const d = e.target.value.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/\D/g, "");
          onChange(d ? Math.min(99999, parseInt(d, 10)) : 0);
        }}
        dir="ltr"
        key={k}
        className={`num bump bg-transparent text-center text-teal outline-none ${big ? "w-24 text-5xl" : "w-16 text-3xl"}`}
      />
      <button
        type="button"
        aria-label="إنقاص"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        className={`${size} grid place-items-center rounded-full border-2 border-line bg-paper text-teal active:scale-90 transition-transform disabled:opacity-30`}
      >
        <Minus size={big ? 28 : 22} strokeWidth={3} />
      </button>
    </div>
  );
}

/** Bottom sheet on phones, centred card on desktop. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade absolute inset-0 bg-teal/50" onClick={onClose} />
      <div className="sheet relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-ground p-5 pb-8 sm:max-w-lg sm:rounded-[22px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="num text-2xl text-teal">{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="grid h-11 w-11 place-items-center rounded-full bg-paper text-teal">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Done({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="enter flex flex-col items-center py-8 text-center">
      <div className="relative mb-5 grid h-28 w-28 place-items-center">
        <span className="ring absolute inset-0 rounded-full bg-sun" />
        <span className="absolute inset-0 rounded-full bg-cash" />
        <svg viewBox="0 0 52 52" className="relative h-16 w-16" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path className="draw" d="M14 27 l8 8 l16 -18" />
        </svg>
      </div>
      <p className="num text-4xl text-teal">{title}</p>
      {sub && <div className="mt-2 text-lg text-muted">{sub}</div>}
      {children && <div className="mt-8 flex w-full max-w-sm flex-col gap-3">{children}</div>}
    </div>
  );
}

/** `onDark` for the teal sign-in screen, where a faint red tint would not be readable. */
export function ErrorLine({ msg, onDark = false }: { msg?: string | null; onDark?: boolean }) {
  if (!msg) return null;
  return (
    <p key={msg} role="alert" className={`shake rounded-btn px-4 py-3 text-center font-semibold text-debt ${onDark ? "bg-white" : "bg-debt/10"}`}>
      {msg}
    </p>
  );
}

export function Empty({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-panel border-2 border-dashed border-line px-6 py-10 text-center">
      <div className="text-teal/40">{icon}</div>
      <p className="text-lg font-bold text-teal">{title}</p>
      {sub && <p className="text-muted">{sub}</p>}
    </div>
  );
}

export function Skeleton({ h = "h-24" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-panel bg-line/50`} />;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="num text-[2rem] text-teal">{title}</h1>
        {sub && <p className="text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** Amount field with quick buttons; accepts Eastern digits. */
export function AmountField({ value, onChange, quick = [], label }: { value: number; onChange: (v: number) => void; quick?: number[]; label: string }) {
  return (
    <div>
      <label className="label mb-1 block">{label}</label>
      <div className="relative">
        <input
          inputMode="numeric"
          dir="ltr"
          value={value ? n(value) : ""}
          placeholder="0"
          onChange={(e) => {
            const d = e.target.value.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/\D/g, "");
            onChange(d ? Math.min(999_999_999, parseInt(d, 10)) : 0);
          }}
          className="field num text-left text-3xl text-teal"
          style={{ paddingLeft: "3.5rem" }}
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">د.ع</span>
      </div>
      {quick.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {quick.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => onChange(q)}>
              <Num v={q} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
