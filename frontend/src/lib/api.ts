import axios, { AxiosError } from "axios";
import { getToken, removeToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor - attach JWT
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — unwrap { success, data } envelope + handle auth errors
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      response.data = body.data;
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const hadToken = !!getToken();
      removeToken();
      // Only redirect if there was an active session (not a fresh login attempt)
      if (hadToken && typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  name: string;
  role: "OWNER" | "SUPERVISOR" | "WORKER";
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Dashboard stats shape — mapped from the backend KPI response
export interface DashboardStats {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  snowProduced: number;
  snowSold: number;
  snowWasted: number;
  cofounderShare: number;
  revenueChart: { date: string; revenue: number; expenses: number }[];
  recentTransactions: RecentTransaction[];
  topCustomers: { id: number | null; name: string; total: number }[];
}

export interface RecentTransaction {
  id: number;
  type: "goods_sale" | "snow_sale" | "expense";
  reference: string;
  party: string;
  amount: number;
  paymentType: string;
  date: string;
  snowType?: string;
  category?: string;
}

// SnowProduction — field names match what the backend actually returns
export interface SnowProduction {
  id: number;
  date: string;
  totalBlocks: number;
  wastedBlocks: number;
  blocksSoldWhole: number;
  blocksSoldCrushed: number;
  pricePerBlock: number;
  pricePerCrushed: number;
  notes?: string;
  createdBy?: { id: number; name: string };
  createdAt: string;
}

// SnowSale — field names match backend; amountDue is computed client-side
export interface SnowSale {
  id: number;
  receiptNumber: string;
  date: string;
  customer?: Customer;
  customerName: string;
  snowType: "BLOCK" | "CRUSHED";
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentType: "CASH" | "DEBT" | "PARTIAL";
  amountPaid: number;
  amountDue: number;
  notes?: string;
  createdBy?: { id: number; name: string };
  createdAt: string;
}

// GoodsSale — field names match backend; amountDue is computed client-side
export interface GoodsSale {
  id: number;
  receiptNumber: string;
  date: string;
  customer?: Customer;
  customerName: string;
  items: GoodsSaleItem[];
  totalAmount: number;
  paymentType: "CASH" | "DEBT" | "PARTIAL";
  amountPaid: number;
  amountDue: number;
  notes?: string;
  createdBy?: { id: number; name: string };
  createdAt: string;
}

export interface GoodsSaleItem {
  id: number;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Product — field names match backend (sellingPrice, no stockQuantity)
export interface Product {
  id: number;
  name: string;
  category: string;
  unit: string;
  sellingPrice: number;
  /** Alias kept for pages that still reference currentPrice */
  currentPrice: number;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Purchase — mapped from backend PurchaseOrder
export interface Purchase {
  id: number;
  date: string;
  supplier?: Supplier;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  paymentType: "CASH" | "DEBT" | "PARTIAL";
  amountPaid: number;
  amountDue: number;
  notes?: string;
  createdBy?: { id: number; name: string; username: string };
  createdAt: string;
}

export interface PurchaseItem {
  id: number;
  product?: Product;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Expense {
  id: number;
  date: string;
  category: "GAS" | "ELECTRICITY" | "WATER" | "SALARY" | "OTHER";
  description?: string;
  amount: number;
  notes?: string;
  createdBy?: { id: number; name: string };
  // Alias kept for pages that still reference recordedBy
  recordedBy?: { id: number; name: string };
  createdAt: string;
}

// Customer — list endpoint returns raw records (no computed stats)
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  totalPurchases: number;
  totalDebt: number;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  contact?: string;
  address?: string;
  totalPurchases: number;
  outstandingDebt: number;
  createdAt: string;
}

export interface Transaction {
  id: number;
  type: "SNOW_SALE" | "GOODS_SALE" | "PURCHASE" | "EXPENSE";
  date: string;
  description: string;
  amount: number;
  paymentType?: string;
}

export interface Report {
  period: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  snowRevenue: number;
  goodsRevenue: number;
  cofounderShare: number;
  transactions: Transaction[];
  expenseBreakdown: { category: string; total: number }[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login", { username, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/api/auth/me");
  return data;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
// Backend returns: { period, dateRange, revenue:{total,snow,goods,...},
//   expenses:{total,count}, profit:{gross,net}, debt:{...},
//   snowProduction:{batches,blocksProduced,blocksWasted,blocksSoldWhole,blocksSoldCrushed,...},
//   coFounderShare, topCustomers, recentTransactions, comparison }
// We map that to the flat DashboardStats shape the page expects.

export async function getDashboardStats(period: "daily" | "weekly" | "monthly"): Promise<DashboardStats> {
  // Map frontend period names to backend period query values
  const periodMap: Record<string, string> = {
    daily: "today",
    weekly: "week",
    monthly: "month",
  };
  const { data } = await api.get(`/api/dashboard?period=${periodMap[period] ?? period}`);
  const d = data as Record<string, unknown>;

  const revenue = (d.revenue as Record<string, number>) ?? {};
  const expenses = (d.expenses as Record<string, number>) ?? {};
  const profit = (d.profit as Record<string, number>) ?? {};
  const snowProduction = (d.snowProduction as Record<string, number>) ?? {};
  const recentTransactions = (d.recentTransactions as RecentTransaction[]) ?? [];
  const topCustomers = (d.topCustomers as { id: number | null; name: string; total: number }[]) ?? [];

  return {
    period: (d.period as string) ?? period,
    revenue: revenue.total ?? 0,
    expenses: expenses.total ?? 0,
    profit: profit.net ?? 0,
    snowProduced: snowProduction.blocksProduced ?? 0,
    snowSold: (snowProduction.blocksSoldWhole ?? 0) + (snowProduction.blocksSoldCrushed ?? 0),
    snowWasted: snowProduction.blocksWasted ?? 0,
    cofounderShare: (d.coFounderShare as number) ?? 0,
    // Backend doesn't compute a day-by-day chart for the dashboard; pass empty array
    revenueChart: [],
    recentTransactions,
    topCustomers,
  };
}

// ─── Snow Production ─────────────────────────────────────────────────────────
// Backend returns: { productions: [...], pagination: { total, page, limit, pages } }
// We expose: { data: SnowProduction[], total: number }

export async function getSnowProductions(params?: {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: SnowProduction[]; total: number; page: number; limit: number }> {
  const { data } = await api.get("/api/snow/productions", { params });
  const d = data as { productions: SnowProduction[]; pagination: { total: number; page: number; limit: number; pages: number } };
  return {
    data: d.productions ?? [],
    total: d.pagination?.total ?? 0,
    page: d.pagination?.page ?? 1,
    limit: d.pagination?.limit ?? 20,
  };
}

export async function createSnowProduction(payload: {
  date: string;
  totalBlocks: number;
  wastedBlocks: number;
  blocksSoldWhole: number;
  blocksSoldCrushed: number;
  pricePerBlock: number;
  pricePerCrushed: number;
  notes?: string;
}): Promise<SnowProduction> {
  const { data } = await api.post<SnowProduction>("/api/snow/productions", payload);
  return data;
}

export async function updateSnowProduction(id: number, payload: Partial<SnowProduction>): Promise<SnowProduction> {
  const { data } = await api.put<SnowProduction>(`/api/snow/productions/${id}`, payload);
  return data;
}

export async function deleteSnowProduction(id: number): Promise<void> {
  await api.delete(`/api/snow/productions/${id}`);
}

// ─── Snow Sales ───────────────────────────────────────────────────────────────
// Backend returns: { sales: [...], pagination: { total, page, limit, pages } }
// We expose: { data: SnowSale[], total: number }
// We also compute amountDue = totalAmount - amountPaid on each record.

function mapSnowSale(s: Record<string, unknown>): SnowSale {
  const totalAmount = (s.totalAmount as number) ?? 0;
  const amountPaid = (s.amountPaid as number) ?? 0;
  return {
    ...(s as unknown as SnowSale),
    amountDue: Math.max(0, totalAmount - amountPaid),
  };
}

export async function getSnowSales(params?: {
  from?: string;
  to?: string;
  snowType?: string;
  paymentType?: string;
  customerId?: number;
  page?: number;
  limit?: number;
}): Promise<{ data: SnowSale[]; total: number }> {
  const { data } = await api.get("/api/snow/sales", { params });
  const d = data as { sales: Record<string, unknown>[]; pagination: { total: number } };
  return {
    data: (d.sales ?? []).map(mapSnowSale),
    total: d.pagination?.total ?? 0,
  };
}

export async function createSnowSale(payload: {
  customerName: string;
  customerId?: number;
  snowType: "BLOCK" | "CRUSHED";
  quantity: number;
  unitPrice: number;
  paymentType: "CASH" | "DEBT" | "PARTIAL";
  amountPaid: number;
  notes?: string;
  date?: string;
}): Promise<SnowSale> {
  const { data } = await api.post("/api/snow/sales", payload);
  return mapSnowSale(data as Record<string, unknown>);
}

export async function deleteSnowSale(id: number): Promise<void> {
  await api.delete(`/api/snow/sales/${id}`);
}

// ─── Goods Sales ──────────────────────────────────────────────────────────────
// Backend returns: { sales: [...], pagination: { total, page, limit, pages } }
// We expose: { data: GoodsSale[], total: number }
// We also compute amountDue and normalise item.totalPrice.

function mapGoodsSale(s: Record<string, unknown>): GoodsSale {
  const totalAmount = (s.totalAmount as number) ?? 0;
  const amountPaid = (s.amountPaid as number) ?? 0;
  const rawItems = (s.items as Record<string, unknown>[]) ?? [];
  const items: GoodsSaleItem[] = rawItems.map((item) => ({
    ...(item as unknown as GoodsSaleItem),
    totalPrice: (item.totalPrice as number) ?? ((item.quantity as number) ?? 0) * ((item.unitPrice as number) ?? 0),
    product: item.product
      ? mapProduct(item.product as Record<string, unknown>)
      : undefined,
  }));
  return {
    ...(s as unknown as GoodsSale),
    items,
    amountDue: Math.max(0, totalAmount - amountPaid),
  };
}

function mapProduct(p: Record<string, unknown>): Product {
  const sellingPrice = (p.sellingPrice as number) ?? 0;
  return {
    ...(p as unknown as Product),
    sellingPrice,
    // currentPrice alias so pages that use product.currentPrice still work
    currentPrice: sellingPrice,
    stockQuantity: (p.stockQuantity as number) ?? 0,
  };
}

export async function getGoodsSales(params?: {
  from?: string;
  to?: string;
  paymentType?: string;
  customerId?: number;
  receiptNumber?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: GoodsSale[]; total: number }> {
  const { data } = await api.get("/api/sales", { params });
  const d = data as { sales: Record<string, unknown>[]; pagination: { total: number } };
  return {
    data: (d.sales ?? []).map(mapGoodsSale),
    total: d.pagination?.total ?? 0,
  };
}

export async function createGoodsSale(payload: {
  customerName: string;
  customerId?: number;
  items: { productId: number; quantity: number; unitPrice: number }[];
  paymentType: "CASH" | "DEBT" | "PARTIAL";
  amountPaid: number;
  notes?: string;
  date?: string;
}): Promise<GoodsSale> {
  const { data } = await api.post("/api/sales", payload);
  return mapGoodsSale(data as Record<string, unknown>);
}

export async function deleteGoodsSale(id: number): Promise<void> {
  await api.delete(`/api/sales/${id}`);
}

// ─── Products ─────────────────────────────────────────────────────────────────
// Backend returns: Product[] (array directly, no pagination)

export async function getProducts(): Promise<Product[]> {
  const { data } = await api.get<Record<string, unknown>[]>("/api/products");
  return (data as Record<string, unknown>[]).map(mapProduct);
}

export async function createProduct(payload: {
  name: string;
  category?: string;
  unit: string;
  sellingPrice?: number;
  currentPrice?: number;
  stockQuantity?: number;
}): Promise<Product> {
  // Accept either sellingPrice or currentPrice from callers
  const body = {
    name: payload.name,
    category: payload.category ?? "عام",
    unit: payload.unit,
    sellingPrice: payload.sellingPrice ?? payload.currentPrice ?? 0,
  };
  const { data } = await api.post<Record<string, unknown>>("/api/products", body);
  return mapProduct(data);
}

export async function updateProduct(id: number, payload: Partial<Product>): Promise<Product> {
  const body: Record<string, unknown> = { ...payload };
  // Map currentPrice → sellingPrice if needed
  if (body.currentPrice !== undefined && body.sellingPrice === undefined) {
    body.sellingPrice = body.currentPrice;
  }
  const { data } = await api.put<Record<string, unknown>>(`/api/products/${id}`, body);
  return mapProduct(data);
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/api/products/${id}`);
}

// ─── Purchases ────────────────────────────────────────────────────────────────
// Backend returns: { orders: [...], pagination: { total, page, limit, pages } }
// Backend PurchaseOrder has `supplier` (relation), not `supplierName` directly.
// Items have no `itemName` field — the backend schema uses productId only.
// We map to the Purchase shape the page expects.

function mapPurchaseOrder(o: Record<string, unknown>): Purchase {
  const totalAmount = (o.totalAmount as number) ?? 0;
  const amountPaid = (o.amountPaid as number) ?? 0;
  const supplier = o.supplier as Record<string, unknown> | undefined;
  const rawItems = (o.items as Record<string, unknown>[]) ?? [];

  const items: PurchaseItem[] = rawItems.map((item) => ({
    ...(item as unknown as PurchaseItem),
    itemName: item.product
      ? ((item.product as Record<string, unknown>).name as string) ?? ""
      : `صنف #${item.id}`,
    totalPrice:
      (item.totalPrice as number) ??
      ((item.quantity as number) ?? 0) * ((item.unitPrice as number) ?? 0),
    product: item.product ? mapProduct(item.product as Record<string, unknown>) : undefined,
  }));

  return {
    ...(o as unknown as Purchase),
    supplierName: supplier ? (supplier.name as string) ?? "" : "",
    items,
    amountDue: Math.max(0, totalAmount - amountPaid),
  };
}

export async function getPurchases(params?: {
  from?: string;
  to?: string;
  supplierId?: number;
  paymentType?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Purchase[]; total: number }> {
  const { data } = await api.get("/api/purchases", { params });
  const d = data as { orders: Record<string, unknown>[]; pagination: { total: number } };
  return {
    data: (d.orders ?? []).map(mapPurchaseOrder),
    total: d.pagination?.total ?? 0,
  };
}

export async function createPurchase(payload: {
  supplierName?: string;
  supplierId?: number;
  date: string;
  items: { itemName?: string; productId?: number; quantity: number; unitPrice: number }[];
  paymentType: "CASH" | "DEBT" | "PARTIAL";
  amountPaid: number;
  notes?: string;
}): Promise<Purchase> {
  // Backend requires supplierId (not supplierName) and productId (not itemName).
  // The purchases page currently sends supplierName + itemName-based items.
  // We pass the payload through; if backend rejects it the page will show an error.
  const { data } = await api.post("/api/purchases", payload);
  return mapPurchaseOrder(data as Record<string, unknown>);
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
// Backend returns: { expenses: [...], summary: [...], grandTotal: number, pagination: {...} }
// We expose: { data: Expense[], total: number }
// We also normalise recordedBy alias.

function mapExpense(e: Record<string, unknown>): Expense {
  const createdBy = e.createdBy as { id: number; name: string } | undefined;
  return {
    ...(e as unknown as Expense),
    createdBy,
    recordedBy: createdBy,
  };
}

export async function getExpenses(params?: {
  from?: string;
  to?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Expense[]; total: number }> {
  const { data } = await api.get("/api/expenses", { params });
  const d = data as { expenses: Record<string, unknown>[]; pagination: { total: number } };
  return {
    data: (d.expenses ?? []).map(mapExpense),
    total: d.pagination?.total ?? 0,
  };
}

export async function createExpense(payload: {
  date: string;
  category: "GAS" | "ELECTRICITY" | "WATER" | "SALARY" | "OTHER";
  description: string;
  amount: number;
  notes?: string;
}): Promise<Expense> {
  const { data } = await api.post("/api/expenses", payload);
  return mapExpense(data as Record<string, unknown>);
}

export async function deleteExpense(id: number): Promise<void> {
  await api.delete(`/api/expenses/${id}`);
}

// ─── Customers ────────────────────────────────────────────────────────────────
// Backend list returns: Customer[] directly (after interceptor unwrap).
// Individual customer records don't have totalPurchases/totalDebt — those
// are only in getCustomerById. We add defaults here so the list page doesn't crash.

function mapCustomer(c: Record<string, unknown>): Customer {
  return {
    ...(c as unknown as Customer),
    totalPurchases: (c.totalPurchases as number) ?? 0,
    totalDebt: (c.totalDebt as number) ?? 0,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const { data } = await api.get<Record<string, unknown>[]>("/api/customers");
  return (data as Record<string, unknown>[]).map(mapCustomer);
}

export async function createCustomer(payload: {
  name: string;
  phone?: string;
  address?: string;
}): Promise<Customer> {
  const { data } = await api.post<Record<string, unknown>>("/api/customers", payload);
  return mapCustomer(data);
}

export async function updateCustomer(id: number, payload: Partial<Customer>): Promise<Customer> {
  const { data } = await api.put<Record<string, unknown>>(`/api/customers/${id}`, payload);
  return mapCustomer(data);
}

// Customer transactions: backend has no dedicated /transactions endpoint.
// GET /api/customers/:id returns the full customer with embedded recent sales.
// We derive a Transaction list from those embedded arrays.
export async function getCustomerTransactions(customerId: number): Promise<Transaction[]> {
  const { data } = await api.get<Record<string, unknown>>(`/api/customers/${customerId}`);
  const d = data as Record<string, unknown>;

  const goodsSales = (d.goodsSales as Record<string, unknown>[]) ?? [];
  const snowSales = (d.snowSales as Record<string, unknown>[]) ?? [];

  const txns: Transaction[] = [
    ...goodsSales.map((s) => ({
      id: s.id as number,
      type: "GOODS_SALE" as const,
      date: s.date as string,
      description: `فاتورة بضاعة #${s.receiptNumber ?? s.id}`,
      amount: (s.totalAmount as number) ?? 0,
      paymentType: s.paymentType as string,
    })),
    ...snowSales.map((s) => ({
      id: s.id as number,
      type: "SNOW_SALE" as const,
      date: s.date as string,
      description: `بيع ثلج #${s.receiptNumber ?? s.id}`,
      amount: ((s.quantity as number) ?? 0) * ((s.unitPrice as number) ?? 0),
      paymentType: s.paymentType as string,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return txns;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
// Backend returns Supplier[] with no outstandingDebt field — add default 0.

function mapSupplier(s: Record<string, unknown>): Supplier {
  return {
    ...(s as unknown as Supplier),
    totalPurchases: (s.totalPurchases as number) ?? 0,
    outstandingDebt: (s.outstandingDebt as number) ?? 0,
  };
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get<Record<string, unknown>[]>("/api/suppliers");
  return (data as Record<string, unknown>[]).map(mapSupplier);
}

export async function createSupplier(payload: {
  name: string;
  phone?: string;
  address?: string;
}): Promise<Supplier> {
  const { data } = await api.post<Record<string, unknown>>("/api/suppliers", payload);
  return mapSupplier(data);
}

export async function updateSupplier(id: number, payload: Partial<Supplier>): Promise<Supplier> {
  const { data } = await api.put<Record<string, unknown>>(`/api/suppliers/${id}`, payload);
  return mapSupplier(data);
}

// ─── Reports ──────────────────────────────────────────────────────────────────
// Backend routes: /api/reports/daily, /api/reports/weekly, /api/reports/monthly,
//                 /api/reports/custom?from=...&to=...
// We map to the Report shape the page expects.

export async function getReport(params: {
  period: "daily" | "weekly" | "monthly";
  startDate?: string;
  endDate?: string;
}): Promise<Report> {
  const { period, startDate, endDate } = params;

  let rawData: Record<string, unknown>;

  if (period === "daily") {
    const { data } = await api.get("/api/reports/daily", {
      params: { date: startDate },
    });
    rawData = data as Record<string, unknown>;
    const summary = (rawData.summary as Record<string, number>) ?? {};
    return {
      period,
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      totalRevenue: summary.totalRevenue ?? 0,
      totalExpenses: summary.totalExpenses ?? 0,
      netProfit: summary.netProfit ?? 0,
      snowRevenue: summary.snowRevenue ?? 0,
      goodsRevenue: summary.goodsRevenue ?? 0,
      cofounderShare: Math.round((summary.snowRevenue ?? 0) * 0.5 * 100) / 100,
      expenseBreakdown: [],
      transactions: buildTransactionsFromDayData(rawData),
    };
  }

  if (period === "weekly") {
    const { data } = await api.get("/api/reports/weekly", {
      params: { date: startDate },
    });
    rawData = data as Record<string, unknown>;
    const summary = (rawData.summary as Record<string, number>) ?? {};
    return {
      period,
      startDate: (rawData.weekStart as string) ?? startDate ?? "",
      endDate: (rawData.weekEnd as string) ?? endDate ?? "",
      totalRevenue: summary.totalRevenue ?? 0,
      totalExpenses: summary.totalExpenses ?? 0,
      netProfit: summary.netProfit ?? 0,
      snowRevenue: summary.snowRevenue ?? 0,
      goodsRevenue: summary.goodsRevenue ?? 0,
      cofounderShare: Math.round((summary.snowRevenue ?? 0) * 0.5 * 100) / 100,
      expenseBreakdown: [],
      transactions: [],
    };
  }

  if (period === "monthly") {
    const refDate = startDate ? new Date(startDate) : new Date();
    const { data } = await api.get("/api/reports/monthly", {
      params: {
        year: refDate.getFullYear(),
        month: refDate.getMonth() + 1,
      },
    });
    rawData = data as Record<string, unknown>;
    const summary = (rawData.summary as Record<string, number>) ?? {};
    const expByCategory = (rawData.expensesByCategory as { category: string; total: number }[]) ?? [];
    return {
      period,
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      totalRevenue: summary.totalRevenue ?? 0,
      totalExpenses: summary.totalExpenses ?? 0,
      netProfit: summary.netProfit ?? 0,
      snowRevenue: summary.snowRevenue ?? 0,
      goodsRevenue: summary.goodsRevenue ?? 0,
      cofounderShare: Math.round((summary.snowRevenue ?? 0) * 0.5 * 100) / 100,
      expenseBreakdown: expByCategory,
      transactions: [],
    };
  }

  // Fallback: custom range
  const { data } = await api.get("/api/reports/custom", {
    params: { from: startDate, to: endDate },
  });
  rawData = data as Record<string, unknown>;
  const summary = (rawData.summary as Record<string, number>) ?? {};
  return {
    period,
    startDate: startDate ?? "",
    endDate: endDate ?? "",
    totalRevenue: summary.totalRevenue ?? 0,
    totalExpenses: summary.totalExpenses ?? 0,
    netProfit: summary.netProfit ?? 0,
    snowRevenue: summary.snowRevenue ?? 0,
    goodsRevenue: summary.goodsRevenue ?? 0,
    cofounderShare: Math.round((summary.snowRevenue ?? 0) * 0.5 * 100) / 100,
    expenseBreakdown: [],
    transactions: [],
  };
}

function buildTransactionsFromDayData(day: Record<string, unknown>): Transaction[] {
  const goodsSales = (day.goodsSales as Record<string, unknown>[]) ?? [];
  const snowSales = (day.snowSales as Record<string, unknown>[]) ?? [];
  const expenses = (day.expenses as Record<string, unknown>[]) ?? [];

  return [
    ...goodsSales.map((s) => ({
      id: s.id as number,
      type: "GOODS_SALE" as const,
      date: s.date as string,
      description: `${s.customerName ?? "عميل"} - بيع بضاعة`,
      amount: (s.totalAmount as number) ?? 0,
      paymentType: s.paymentType as string,
    })),
    ...snowSales.map((s) => ({
      id: s.id as number,
      type: "SNOW_SALE" as const,
      date: s.date as string,
      description: `${s.customerName ?? "عميل"} - بيع ثلج`,
      amount: ((s.quantity as number) ?? 0) * ((s.unitPrice as number) ?? 0),
      paymentType: s.paymentType as string,
    })),
    ...expenses.map((e) => ({
      id: e.id as number,
      type: "EXPENSE" as const,
      date: e.date as string,
      description: (e.description as string) ?? (e.category as string) ?? "مصروف",
      amount: (e.amount as number) ?? 0,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/api/users");
  return data;
}

export async function createUser(payload: {
  username: string;
  password: string;
  name: string;
  role: "OWNER" | "SUPERVISOR" | "WORKER";
}): Promise<User> {
  const { data } = await api.post<User>("/api/users", payload);
  return data;
}

export async function updateUser(id: number, payload: Partial<User & { password?: string }>): Promise<User> {
  const { data } = await api.put<User>(`/api/users/${id}`, payload);
  return data;
}

export async function deactivateUser(id: number): Promise<void> {
  await api.put(`/api/users/${id}`, { isActive: false });
}
