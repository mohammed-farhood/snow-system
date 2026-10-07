"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Snowflake, Package, UserRound } from "lucide-react";
import { api, post, put, type Product, type Role, type SecretKind, type Settings, type UserRow } from "@/lib/api";
import { ROLE } from "@/lib/format";
import { Shell, useMe } from "@/components/Shell";
import { AmountField, ErrorLine, Money, PageTitle, Sheet, Skeleton } from "@/components/ui";

type Tab = "products" | "people" | "factory";

export default function SettingsPage() {
  return (
    <Shell roles={["OWNER"]}>
      <SettingsView />
    </Shell>
  );
}

function SettingsView() {
  const [tab, setTab] = useState<Tab>("products");
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="الإعدادات" />
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(
          [
            ["products", "الأسعار"],
            ["people", "العمال"],
            ["factory", "المصنع"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className="chip justify-center" aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "products" && <Products />}
      {tab === "people" && <People />}
      {tab === "factory" && <Factory />}
    </div>
  );
}

// ─── Products & prices ───────────────────────────────────────────────────────

type Draft = { id?: number; name: string; kind: "ICE" | "GOODS"; unit: string; price: number; blocksPerUnit: number; openingStock: number; isActive: boolean };
const blank: Draft = { name: "", kind: "GOODS", unit: "كارتون", price: 0, blocksPerUnit: 1, openingStock: 0, isActive: true };

function Products() {
  const { data } = useQuery({ queryKey: ["products"], queryFn: () => api<Product[]>("/products") });
  const [edit, setEdit] = useState<Draft | null>(null);
  if (!data) return <Skeleton h="h-60" />;
  return (
    <div className="grid gap-2">
      {data.map((p) => (
        <button key={p.id} onClick={() => setEdit({ ...p })} className={`panel flex items-center gap-3 p-3 text-right ${p.isActive ? "" : "opacity-50"}`}>
          <span className={`grid h-11 w-11 place-items-center rounded-full ${p.kind === "ICE" ? "bg-teal text-sun" : "bg-teal/10 text-teal"}`}>
            {p.kind === "ICE" ? <Snowflake size={20} /> : <Package size={20} />}
          </span>
          <span className="flex-1">
            <span className="block font-bold">{p.name}</span>
            <span className="text-sm text-muted">
              {p.isActive ? <>بالمخزن <span dir="ltr">{p.stock}</span> {p.unit}</> : "موقوف"}
            </span>
          </span>
          <Money v={p.price} className="num text-xl text-teal" />
        </button>
      ))}
      <button className="btn-ghost mt-2" onClick={() => setEdit({ ...blank })}>
        <Plus /> مادة جديدة
      </button>
      <ProductSheet draft={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function ProductSheet({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [d, setD] = useState<Draft>(blank);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (draft) {
      setD(draft);
      setError(null);
    }
  }, [draft]);
  const save = async () => {
    try {
      const body = { name: d.name, kind: d.kind, unit: d.unit, price: d.price, blocksPerUnit: Number(d.blocksPerUnit) || 1, openingStock: d.openingStock, isActive: d.isActive };
      if (d.id) await put(`/products/${d.id}`, body);
      else await post("/products", body);
      qc.invalidateQueries();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Sheet open={!!draft} onClose={onClose} title={d.id ? d.name : "مادة جديدة"}>
      <div className="grid gap-4">
        {!d.id && (
          <div className="grid grid-cols-2 gap-2">
            <button className="chip justify-center" aria-pressed={d.kind === "GOODS"} onClick={() => setD({ ...d, kind: "GOODS", unit: "كارتون" })}>بضاعة نشتريها</button>
            <button className="chip justify-center" aria-pressed={d.kind === "ICE"} onClick={() => setD({ ...d, kind: "ICE", unit: "قالب" })}>ثلج من إنتاجنا</button>
          </div>
        )}
        <label>
          <span className="label">الاسم</span>
          <input className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </label>
        <AmountField label="سعر البيع" value={d.price} onChange={(v) => setD({ ...d, price: v })} />
        <label>
          <span className="label">الوحدة</span>
          <input className="field" value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value })} placeholder="قالب، كيس، كارتون..." />
        </label>
        {d.kind === "ICE" ? (
          <label>
            <span className="label">كل {d.unit || "وحدة"} يستهلك كم قالب؟</span>
            <input className="field" dir="ltr" inputMode="decimal" value={String(d.blocksPerUnit)} onChange={(e) => setD({ ...d, blocksPerUnit: e.target.value as unknown as number })} />
            <span className="text-sm text-muted">القالب الكامل = 1. كيس مجروش من نص قالب = 0.5</span>
          </label>
        ) : (
          <label>
            <span className="label">كم عندك منه هسه؟ (رصيد أول مرة)</span>
            <input
              className="field"
              dir="ltr"
              inputMode="numeric"
              value={d.openingStock || ""}
              placeholder="0"
              onChange={(e) => setD({ ...d, openingStock: parseInt(e.target.value.replace(/\D/g, "") || "0", 10) })}
            />
          </label>
        )}
        {d.id && (
          <label className="flex items-center justify-between rounded-btn bg-paper p-4">
            <span className="font-bold">يظهر بشاشة البيع</span>
            <input type="checkbox" className="h-6 w-6 accent-[var(--teal)]" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} />
          </label>
        )}
        <ErrorLine msg={error} />
        <button className="btn-sun" disabled={!d.name.trim()} onClick={save}>حفظ</button>
      </div>
    </Sheet>
  );
}

// ─── People & sign-in ────────────────────────────────────────────────────────

type Person = { id?: number; name: string; role: Role; isActive: boolean; secretKind: SecretKind; savedKind?: SecretKind; pin: string };

function People() {
  const me = useMe();
  const { data } = useQuery({ queryKey: ["users"], queryFn: () => api<UserRow[]>("/users") });
  const [edit, setEdit] = useState<Person | null>(null);
  if (!data) return <Skeleton h="h-60" />;
  return (
    <div className="grid gap-2">
      <p className="mb-1 text-muted">كل واحد يدخل باسمه، برمز من 4 أرقام أو بكلمة سر يكتبها.</p>
      {data.map((u) => (
        <button key={u.id} onClick={() => setEdit({ ...u, savedKind: u.secretKind, pin: "" })} className={`panel flex items-center gap-3 p-3 text-right ${u.isActive ? "" : "opacity-50"}`}>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-teal/10 text-teal"><UserRound size={20} /></span>
          <span className="flex-1">
            <span className="block font-bold">{u.name} {u.id === me?.id && <span className="text-sm text-muted">(أنت)</span>}</span>
            <span className="text-sm text-muted">
              {u.isActive ? ROLE[u.role] : "موقوف"}، {u.secretKind === "PIN" ? "رمز 4 أرقام" : "كلمة سر"}
            </span>
          </span>
        </button>
      ))}
      <button className="btn-ghost mt-2" onClick={() => setEdit({ name: "", role: "WORKER", isActive: true, secretKind: "PIN", pin: "" })}>
        <Plus /> شخص جديد
      </button>
      <PersonSheet p={edit} self={edit?.id === me?.id} onClose={() => setEdit(null)} />
    </div>
  );
}

const toWestern = (s: string) => s.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));

function PersonSheet({ p, self, onClose }: { p: Person | null; self: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [d, setD] = useState<Person>({ name: "", role: "WORKER", isActive: true, secretKind: "PIN", pin: "" });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (p) {
      setD(p);
      setError(null);
    }
  }, [p]);

  const pinKind = d.secretKind === "PIN";
  // A new person, or someone switching between PIN and password, must be given the new secret.
  const needsSecret = !d.id || d.secretKind !== d.savedKind;
  const secretOk = pinKind ? /^\d{4}$/.test(d.pin) : d.pin.replace(/\s/g, "").length >= 4;
  const canSave = !!d.name.trim() && (d.pin ? secretOk : !needsSecret);

  const save = async () => {
    try {
      const body = { name: d.name, role: d.role, secretKind: d.secretKind, ...(d.pin ? { pin: d.pin } : {}) };
      if (d.id) await put(`/users/${d.id}`, { ...body, isActive: d.isActive });
      else await post("/users", body);
      qc.invalidateQueries();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Sheet open={!!p} onClose={onClose} title={d.id ? d.name : "شخص جديد"}>
      <div className="grid gap-4">
        <label>
          <span className="label">الاسم</span>
          <input className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </label>
        {!self && (
          <div>
            <span className="label">الصلاحية</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(["WORKER", "SUPERVISOR", "OWNER"] as Role[]).map((r) => (
                <button key={r} className="chip justify-center" aria-pressed={d.role === r} onClick={() => setD({ ...d, role: r })}>
                  {ROLE[r]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-sm text-muted">
              {d.role === "WORKER" && "يبيع، يسجّل إنتاج، ويستلم ديون. ما يشوف الحسابات."}
              {d.role === "SUPERVISOR" && "كل شي غير الإعدادات."}
              {d.role === "OWNER" && "كل شي."}
            </p>
          </div>
        )}
        <div>
          <span className="label">طريقة الدخول</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(
              [
                ["PIN", "رمز 4 أرقام"],
                ["PASSWORD", "كلمة سر يكتبها"],
              ] as [SecretKind, string][]
            ).map(([k, label]) => (
              <button key={k} className="chip justify-center" aria-pressed={d.secretKind === k} onClick={() => setD({ ...d, secretKind: k, pin: "" })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span className="label">
            {needsSecret
              ? pinKind ? "الرمز (4 أرقام)" : "كلمة السر"
              : pinKind ? "رمز جديد (اتركه فارغ إذا ما تريد تغيّره)" : "كلمة سر جديدة (اتركها فارغة إذا ما تريد تغيّرها)"}
          </span>
          {pinKind ? (
            <input
              className="field num text-center text-3xl tracking-[0.5em]"
              dir="ltr"
              inputMode="numeric"
              maxLength={4}
              value={d.pin}
              onChange={(e) => setD({ ...d, pin: toWestern(e.target.value).replace(/\D/g, "").slice(0, 4) })}
            />
          ) : (
            <>
              <textarea
                className="field min-h-[96px] resize-none text-lg"
                dir="rtl"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={300}
                value={d.pin}
                onChange={(e) => setD({ ...d, pin: e.target.value })}
                placeholder="أي كلام، مثلاً جملة يحفظها"
              />
              <span className="text-sm text-muted">نفس الكلمات بالترتيب. المسافات والهمزات والتشكيل ما تفرق.</span>
            </>
          )}
        </label>
        {d.id && !self && (
          <label className="flex items-center justify-between rounded-btn bg-paper p-4">
            <span className="font-bold">يقدر يدخل</span>
            <input type="checkbox" className="h-6 w-6 accent-[var(--teal)]" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} />
          </label>
        )}
        <ErrorLine msg={error} />
        <button className="btn-sun" disabled={!canSave} onClick={save}>
          حفظ
        </button>
      </div>
    </Sheet>
  );
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function Factory() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api<Settings>("/settings") });
  const [d, setD] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (data) setD(data);
  }, [data]);
  if (!d) return <Skeleton h="h-60" />;
  const save = async () => {
    setError(null);
    try {
      await put("/settings", { factoryName: d.factoryName, factoryPhone: d.factoryPhone, partnerPercent: Number(d.partnerPercent) || 0 });
      qc.invalidateQueries();
      setMsg("انحفظ");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="grid gap-4">
      <label>
        <span className="label">اسم المصنع (يطلع بالوصل)</span>
        <input className="field" value={d.factoryName} onChange={(e) => setD({ ...d, factoryName: e.target.value })} />
      </label>
      <label>
        <span className="label">رقم الهاتف (يطلع بالوصل)</span>
        <input className="field" dir="ltr" inputMode="tel" value={d.factoryPhone} onChange={(e) => setD({ ...d, factoryPhone: e.target.value })} placeholder="07..." />
      </label>
      <label>
        <span className="label">حصة الشريك من مبيعات الثلج (%)</span>
        <input className="field" dir="ltr" inputMode="numeric" value={d.partnerPercent} onChange={(e) => setD({ ...d, partnerPercent: e.target.value.replace(/[^\d.]/g, "") })} />
        <span className="text-sm text-muted">تظهر لك أنت فقط بصفحة الحساب. اكتب 0 إذا ماكو شريك.</span>
      </label>
      <ErrorLine msg={error} />
      <button className="btn-sun" onClick={save}>{msg ?? "حفظ"}</button>
    </div>
  );
}
