// Home screen numbers, the day's activity list, and undo.
import { Router, Request } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { h, HttpError, idParam } from "../lib/http";
import { addDays, dayKey, parseDay, startOfDay, today } from "../lib/days";
import { customerBalances, goodsStock, iceStock } from "../lib/ledger";
import { saleInclude } from "./sales";

const router = Router();
const UNDO_MINUTES = 30;
const LOW_STOCK = 10;

const isManager = (req: Request) => req.user!.role !== "WORKER";

router.get(
  "/today",
  h(async (req) => {
    const { from, to } = today();
    const at = { gte: from, lt: to };
    const me = req.user!.id;

    const [stock, prod, mySales, myPayments, iceSold] = await Promise.all([
      iceStock(),
      prisma.production.aggregate({ where: { date: at }, _sum: { blocks: true, wasted: true } }),
      prisma.sale.aggregate({ where: { date: at, createdById: me }, _sum: { paid: true }, _count: true }),
      prisma.payment.aggregate({ where: { date: at, createdById: me, customerId: { not: null } }, _sum: { amount: true } }),
      prisma.$queryRaw<{ n: number | null }[]>`
        SELECT SUM(si.quantity * p."blocksPerUnit")::float AS n FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId" JOIN "Product" p ON p.id = si."productId"
        WHERE p.kind = 'ICE' AND s.date >= ${from} AND s.date < ${to}`,
    ]);

    const base = {
      iceStock: stock,
      producedToday: prod._sum.blocks ?? 0,
      wastedToday: prod._sum.wasted ?? 0,
      iceSoldToday: Math.round(iceSold[0]?.n ?? 0),
      mine: {
        salesCount: mySales._count,
        cashTaken: (mySales._sum.paid ?? 0) + (myPayments._sum.amount ?? 0),
      },
    };
    if (!isManager(req)) return base;

    const weekFrom = addDays(from, -6);
    const [sales, payIn, payOut, expenses, purchases, balances, goods, lowNames, week] = await Promise.all([
      prisma.sale.aggregate({ where: { date: at }, _sum: { total: true, paid: true } }),
      prisma.payment.aggregate({ where: { date: at, customerId: { not: null } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { date: at, supplierId: { not: null } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { date: at }, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: { date: at }, _sum: { paid: true } }),
      customerBalances(),
      goodsStock(),
      prisma.product.findMany({ where: { kind: "GOODS", isActive: true }, select: { id: true, name: true } }),
      prisma.sale.findMany({ where: { date: { gte: weekFrom, lt: to } }, select: { date: true, total: true } }),
    ]);

    const cashIn = (sales._sum.paid ?? 0) + (payIn._sum.amount ?? 0);
    const cashOut = (expenses._sum.amount ?? 0) + (purchases._sum.paid ?? 0) + (payOut._sum.amount ?? 0);
    const days = Array.from({ length: 7 }, (_, i) => ({ day: dayKey(addDays(weekFrom, i)), total: 0 }));
    for (const s of week) {
      const d = days.find((x) => x.day === dayKey(s.date));
      if (d) d.total += s.total;
    }

    return {
      ...base,
      salesTotal: sales._sum.total ?? 0,
      cashIn,
      cashOut,
      drawer: cashIn - cashOut,
      owedToUs: [...balances.values()].filter((v) => v > 0).reduce((a, b) => a + b, 0),
      debtors: [...balances.values()].filter((v) => v > 0).length,
      lowStock: lowNames
        .map((p) => ({ id: p.id, name: p.name, stock: goods.get(p.id) ?? 0 }))
        .filter((p) => p.stock <= LOW_STOCK)
        .sort((a, b) => a.stock - b.stock),
      week: days,
    };
  })
);

type Activity = {
  type: "sale" | "production" | "expense" | "payment" | "purchase";
  id: number;
  at: Date;
  by: { id: number; name: string };
  title: string;
  detail: string;
  amount: number | null;
  owed: number;
  canUndo: boolean;
};

const EXPENSE_LABEL: Record<string, string> = {
  GAS: "غاز",
  ELECTRICITY: "كهرباء",
  WATER: "ماء",
  SALARY: "رواتب",
  MAINTENANCE: "صيانة",
  OTHER: "مصروف آخر",
};

function canUndo(req: Request, createdById: number, at: Date): boolean {
  const u = req.user!;
  if (u.role === "OWNER") return true;
  if (u.role === "SUPERVISOR") return at >= startOfDay();
  return createdById === u.id && Date.now() - at.getTime() < UNDO_MINUTES * 60000;
}

router.get(
  "/activity",
  h(async (req) => {
    const from = typeof req.query.day === "string" ? parseDay(req.query.day) : startOfDay();
    const at = { gte: from, lt: addDays(from, 1) };
    const mineOnly = isManager(req) ? {} : { createdById: req.user!.id };
    const by = { select: { id: true, name: true } };

    const [sales, productions, expenses, payments, purchases] = await Promise.all([
      prisma.sale.findMany({ where: { date: at, ...mineOnly }, include: saleInclude }),
      prisma.production.findMany({ where: { date: at, ...mineOnly }, include: { createdBy: by } }),
      isManager(req) ? prisma.expense.findMany({ where: { date: at }, include: { createdBy: by } }) : [],
      prisma.payment.findMany({
        where: { date: at, ...mineOnly },
        include: { createdBy: by, customer: { select: { name: true } }, supplier: { select: { name: true } } },
      }),
      isManager(req)
        ? prisma.purchase.findMany({
            where: { date: at },
            include: { createdBy: by, supplier: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
          })
        : [],
    ]);

    const list: Activity[] = [
      ...sales.map((s) => ({
        type: "sale" as const,
        id: s.id,
        at: s.date,
        by: s.createdBy,
        title: s.customer?.name ?? "زبون نقدي",
        detail: s.items.map((i) => `${i.quantity} ${i.product.name}`).join("، "),
        amount: s.total,
        owed: s.total - s.paid,
        canUndo: canUndo(req, s.createdById, s.date),
      })),
      ...productions.map((p) => ({
        type: "production" as const,
        id: p.id,
        at: p.date,
        by: p.createdBy,
        title: `إنتاج ${p.blocks} قالب`,
        detail: p.wasted ? `تالف ${p.wasted}` : p.note ?? "",
        amount: null,
        owed: 0,
        canUndo: canUndo(req, p.createdById, p.date),
      })),
      ...expenses.map((e) => ({
        type: "expense" as const,
        id: e.id,
        at: e.date,
        by: e.createdBy,
        title: EXPENSE_LABEL[e.category],
        detail: e.note ?? "",
        amount: -e.amount,
        owed: 0,
        canUndo: canUndo(req, e.createdById, e.date),
      })),
      ...payments.map((p) => ({
        type: "payment" as const,
        id: p.id,
        at: p.date,
        by: p.createdBy,
        title: p.customer ? `تسديد من ${p.customer.name}` : `دفعة إلى ${p.supplier?.name}`,
        detail: p.note ?? "",
        amount: p.customer ? p.amount : -p.amount,
        owed: 0,
        canUndo: canUndo(req, p.createdById, p.date),
      })),
      ...purchases.map((p) => ({
        type: "purchase" as const,
        id: p.id,
        at: p.date,
        by: p.createdBy,
        title: `شراء من ${p.supplier.name}`,
        detail: p.items.map((i) => `${i.quantity} ${i.product.name}`).join("، "),
        amount: -p.paid,
        owed: p.total - p.paid,
        canUndo: canUndo(req, p.createdById, p.date),
      })),
    ];
    list.sort((a, b) => b.at.getTime() - a.at.getTime());
    return list;
  })
);

const MODELS = {
  sale: prisma.sale,
  production: prisma.production,
  expense: prisma.expense,
  payment: prisma.payment,
  purchase: prisma.purchase,
} as const;

router.delete(
  "/activity/:type/:id",
  h(async (req) => {
    const type = req.params.type as keyof typeof MODELS;
    const model = MODELS[type] as unknown as {
      findUnique(a: object): Promise<{ createdById: number; date: Date } | null>;
      delete(a: object): Promise<unknown>;
    };
    if (!model) throw new HttpError(404, "غير موجود");
    const id = idParam(req);
    const row = await model.findUnique({ where: { id } });
    if (!row) throw new HttpError(404, "غير موجود");
    if (!canUndo(req, row.createdById, row.date)) {
      throw new HttpError(403, `يمكن التراجع خلال ${UNDO_MINUTES} دقيقة فقط. اطلب من المشرف`);
    }
    try {
      await model.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) throw new HttpError(409, "لا يمكن الحذف");
      throw e;
    }
    return { removed: true };
  })
);

export default router;
