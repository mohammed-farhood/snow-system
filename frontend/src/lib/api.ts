// Talks to the API on the same domain (/api). Every response is { success, data } or { success: false, error }.

export type Role = "OWNER" | "SUPERVISOR" | "WORKER";
export type Me = { id: number; name: string; role: Role };

const TOKEN = "snow.token";
const ME = "snow.me";

export const session = {
  get token() {
    try {
      return localStorage.getItem(TOKEN);
    } catch {
      return null;
    }
  },
  get me(): Me | null {
    try {
      return JSON.parse(localStorage.getItem(ME) ?? "null");
    } catch {
      return null;
    }
  },
  save(token: string, me: Me) {
    localStorage.setItem(TOKEN, token);
    localStorage.setItem(ME, JSON.stringify(me));
    localStorage.setItem("snow.lastUser", String(me.id));
  },
  clear() {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(ME);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(session.token ? { authorization: `Bearer ${session.token}` } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "لا يوجد اتصال بالإنترنت");
  }
  const json = await res.json().catch(() => null);
  if (res.status === 401 && session.token && !path.startsWith("/auth/login")) {
    session.clear();
    window.location.href = "/login";
  }
  if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error ?? "حدث خطأ. حاول مرة ثانية");
  return json.data as T;
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: "POST", body });
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: "PUT", body });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });

// ─── Shapes returned by the API ──────────────────────────────────────────────

export type Product = {
  id: number;
  name: string;
  kind: "ICE" | "GOODS";
  unit: string;
  price: number;
  blocksPerUnit: number;
  openingStock: number;
  isActive: boolean;
  stock: number;
};

export type Today = {
  iceStock: number;
  producedToday: number;
  wastedToday: number;
  iceSoldToday: number;
  mine: { salesCount: number; cashTaken: number };
  // managers only
  salesTotal?: number;
  cashIn?: number;
  cashOut?: number;
  drawer?: number;
  owedToUs?: number;
  debtors?: number;
  lowStock?: { id: number; name: string; stock: number }[];
  week?: { day: string; total: number }[];
};

export type Activity = {
  type: "sale" | "production" | "expense" | "payment" | "purchase";
  id: number;
  at: string;
  by: { id: number; name: string };
  title: string;
  detail: string;
  amount: number | null;
  owed: number;
  canUndo: boolean;
};

export type Sale = {
  id: number;
  receiptNo: number;
  date: string;
  total: number;
  paid: number;
  note: string | null;
  customer: { id: number; name: string } | null;
  createdBy: { id: number; name: string };
  items: { id: number; quantity: number; price: number; product: { id: number; name: string; unit: string; kind: string } }[];
};

export type CustomerRow = { id: number; name: string; phone: string | null; owed: number; lastSaleAt: string | null; sales: number };
export type CustomerDetail = CustomerRow & {
  sales: Sale[];
  payments: { id: number; date: string; amount: number; note: string | null; createdBy: { name: string } }[];
};
export type SupplierRow = { id: number; name: string; phone: string | null; owed: number };

export type Report = {
  from: string;
  to: string;
  sales: { total: number; ice: number; goods: number; paidNow: number; onCredit: number; count: number };
  collected: number;
  expenses: { total: number; byCategory: { category: string; total: number }[] };
  purchases: { total: number; paid: number };
  goodsCost: number;
  profit: number;
  iceBlocks: { produced: number; wasted: number; sold: number };
  partner: { percent: number; share: number } | null;
  byDay: { day: string; sales: number; expenses: number }[];
  byProduct: { name: string; kind: string; qty: number; total: number }[];
  byWorker: { name: string; count: number; total: number }[];
  topCustomers: { name: string; total: number }[];
};

export type Settings = { factoryName: string; factoryPhone: string; partnerPercent: string };
export type SecretKind = "PIN" | "PASSWORD";
export type UserRow = { id: number; name: string; role: Role; isActive: boolean; secretKind: SecretKind };
