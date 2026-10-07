"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ClipboardList, HandCoins, Home, LogOut, Menu, Settings, ShoppingBasket, Wallet } from "lucide-react";
import { api, session, type Me, type Settings as S } from "@/lib/api";
import { ROLE } from "@/lib/format";
import { Sheet } from "./ui";

type Item = { href: string; label: string; icon: React.ReactNode; roles?: Me["role"][] };

const MAIN: Item[] = [
  { href: "/", label: "الرئيسية", icon: <Home size={24} /> },
  { href: "/debts", label: "الديون", icon: <HandCoins size={24} /> },
  { href: "/log", label: "السجل", icon: <ClipboardList size={24} /> },
];
const MORE: Item[] = [
  { href: "/money", label: "مصاريف ومشتريات", icon: <Wallet size={24} />, roles: ["OWNER", "SUPERVISOR"] },
  { href: "/reports", label: "الحساب", icon: <BarChart3 size={24} />, roles: ["OWNER", "SUPERVISOR"] },
  { href: "/settings", label: "الإعدادات", icon: <Settings size={24} />, roles: ["OWNER"] },
];

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => setMe(session.me), []);
  return me;
}

function logout() {
  session.clear();
  window.location.href = "/login";
}

export function Shell({ children, roles }: { children: React.ReactNode; roles?: Me["role"][] }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [more, setMore] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api<S>("/settings"), enabled: !!me });

  const allowed = roles?.join(",");
  useEffect(() => {
    const m = session.me;
    if (!session.token || !m) router.replace("/login");
    else if (allowed && !allowed.split(",").includes(m.role)) router.replace("/");
    else setMe(m);
  }, [router, allowed]);

  if (!me) return <div className="min-h-dvh bg-ground" />;

  const more_ = MORE.filter((i) => !i.roles || i.roles.includes(me.role));
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-dvh pb-28 lg:pb-10">
      <header className="sticky top-0 z-30 bg-teal text-white">
        <div className="trim h-1.5" />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
            <span className="num text-xl">{settings?.factoryName ?? "مصنع الثلج"}</span>
          </Link>
          <nav className="mr-6 hidden items-center gap-1 lg:flex">
            {[...MAIN, ...more_].map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`rounded-full px-4 py-2 font-semibold transition-colors ${active(i.href) ? "bg-white/15 text-sun" : "text-white/80 hover:text-white"}`}
              >
                {i.label}
              </Link>
            ))}
            <Link href="/sell" className="btn-sun mr-2 min-h-[44px] px-6 text-base">
              <ShoppingBasket size={20} /> بيع
            </Link>
          </nav>
          <div className="mr-auto flex items-center gap-2">
            <div className="text-left leading-tight">
              <p className="font-bold">{me.name}</p>
              {me.name !== ROLE[me.role] && <p className="text-xs text-white/70">{ROLE[me.role]}</p>}
            </div>
            <button onClick={logout} aria-label="خروج" className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main key={path} className="enter mx-auto max-w-6xl px-4 pt-5">
        {children}
      </main>

      {/* Phone: bottom bar with a raised sell button in the middle */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          {[MAIN[0], MAIN[1]].map((i) => (
            <Tab key={i.href} item={i} on={active(i.href)} />
          ))}
          <Link href="/sell" className="-mt-7 flex flex-col items-center pb-1.5" aria-label="بيع">
            <span className={`grid h-16 w-16 place-items-center rounded-full border-4 border-paper bg-sun text-teal shadow-[inset_0_-4px_0_var(--sun-deep)] ${active("/sell") ? "ring-2 ring-teal" : ""}`}>
              <ShoppingBasket size={28} strokeWidth={2.4} />
            </span>
            <span className="text-sm font-bold text-teal">بيع</span>
          </Link>
          <Tab item={MAIN[2]} on={active(MAIN[2].href)} />
          {more_.length ? (
            <button onClick={() => setMore(true)} className={`flex flex-col items-center gap-0.5 py-2 ${more_.some((i) => active(i.href)) ? "text-teal" : "text-muted"}`}>
              <Menu size={24} />
              <span className="text-sm font-semibold">المزيد</span>
            </button>
          ) : (
            <button onClick={logout} className="flex flex-col items-center gap-0.5 py-2 text-muted">
              <LogOut size={24} />
              <span className="text-sm font-semibold">خروج</span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="المزيد">
        <div className="grid gap-3">
          {more_.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setMore(false)} className="panel flex items-center gap-4 p-4 text-lg font-bold text-teal">
              {i.icon}
              {i.label}
            </Link>
          ))}
          <button onClick={logout} className="panel flex items-center gap-4 p-4 text-lg font-bold text-debt">
            <LogOut size={24} /> تسجيل الخروج
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Tab({ item, on }: { item: Item; on: boolean }) {
  return (
    <Link href={item.href} className={`flex flex-col items-center gap-0.5 py-2 ${on ? "text-teal" : "text-muted"}`}>
      <span className={`rounded-full px-3 py-0.5 transition-colors ${on ? "bg-sun/40" : ""}`}>{item.icon}</span>
      <span className="text-sm font-semibold">{item.label}</span>
    </Link>
  );
}
