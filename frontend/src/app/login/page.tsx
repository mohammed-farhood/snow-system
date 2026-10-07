"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Delete } from "lucide-react";
import { api, post, session, type Me } from "@/lib/api";
import { ROLE } from "@/lib/format";
import { ErrorLine, Skeleton } from "@/components/ui";

type Person = { id: number; name: string; role: Me["role"] };

export default function LoginPage() {
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["people"],
    queryFn: () => api<{ people: Person[]; factoryName: string }>("/auth/people"),
  });
  const [who, setWho] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Come back to the last person who used this phone.
  useEffect(() => {
    if (!data || who) return;
    try {
      const last = Number(localStorage.getItem("snow.lastUser"));
      const p = data.people.find((x) => x.id === last);
      if (p) setWho(p);
    } catch {}
  }, [data, who]);

  const press = async (d: string) => {
    if (busy || !who) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setError(null);
    if (next.length < 4) return;
    setBusy(true);
    try {
      const r = await post<{ token: string; user: Me }>("/auth/login", { userId: who.id, pin: next });
      session.save(r.token, r.user);
      window.location.replace("/");
    } catch (e) {
      setError((e as Error).message);
      setPin("");
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!who) return;
    const key = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div className="flex min-h-dvh flex-col bg-teal">
      <div className="trim h-2" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-8">
        <div className="mb-8 flex items-center gap-3 text-white">
          <img src="/icon.svg" alt="" className="h-14 w-14 rounded-2xl" />
          <div>
            <h1 className="num text-4xl">{data?.factoryName ?? "مصنع الثلج"}</h1>
            <p className="text-white/70">{who ? "اكتب رمزك" : "من أنت؟"}</p>
          </div>
        </div>

        {!who ? (
          <div className="enter grid grid-cols-2 gap-3">
            {isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} h="h-28" />)}
            {loadError && <p className="col-span-2 text-center text-white">لا يوجد اتصال. أعد فتح الصفحة.</p>}
            {data?.people.map((p) => (
              <button
                key={p.id}
                onClick={() => setWho(p)}
                className="flex flex-col items-center gap-1 rounded-btn bg-white/10 p-4 text-white transition-transform hover:bg-white/15 active:scale-95"
              >
                <span className="num grid h-14 w-14 place-items-center rounded-full bg-sun text-3xl text-teal">{p.name.replace(/^(أبو|ال)\s?/, "").charAt(0)}</span>
                <span className="text-lg font-bold">{p.name}</span>
                <span className="text-sm text-white/60">{ROLE[p.role]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="enter flex flex-1 flex-col">
            <button onClick={() => { setWho(null); setPin(""); setError(null); }} className="mb-6 flex items-center gap-2 self-start rounded-full bg-white/10 py-2 pl-4 pr-2 text-white">
              <ArrowRight size={20} />
              <span className="num grid h-9 w-9 place-items-center rounded-full bg-sun text-xl text-teal">{who.name.replace(/^(أبو|ال)\s?/, "").charAt(0)}</span>
              <span className="font-bold">{who.name}</span>
              <span className="text-sm text-white/60">ليس أنت؟</span>
            </button>

            <div dir="ltr" className={`mb-6 flex justify-center gap-4 ${error ? "shake" : ""}`} key={error ?? "ok"}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-5 w-5 rounded-full border-2 border-sun transition-colors ${i < pin.length ? "bg-sun" : ""}`} />
              ))}
            </div>
            <div className="mb-4 min-h-[3.5rem]">
              <ErrorLine msg={error} />
            </div>

            <div dir="ltr" className="mt-auto grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <Key key={d} onClick={() => press(d)} disabled={busy}>{d}</Key>
              ))}
              <span />
              <Key onClick={() => press("0")} disabled={busy}>0</Key>
              <Key onClick={() => setPin((p) => p.slice(0, -1))} label="مسح" disabled={busy}>
                <Delete size={28} />
              </Key>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Key({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="num grid h-[72px] place-items-center rounded-btn bg-white/10 text-4xl text-white transition-transform active:scale-90 active:bg-sun active:text-teal disabled:opacity-50"
    >
      {children}
    </button>
  );
}
