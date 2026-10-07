import { Router } from "express";
import prisma from "../lib/prisma";
import { h, HttpError } from "../lib/http";
import { authorize, MANAGERS } from "../middleware/auth";
import { addDays, dayKey, parseDay, startOfDay } from "../lib/days";
import { averageCosts, readSettings } from "../lib/ledger";

const router = Router();

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD (both days included)
router.get(
  "/",
  authorize(...MANAGERS),
  h(async (req) => {
    let from: Date, to: Date;
    try {
      from = typeof req.query.from === "string" ? parseDay(req.query.from) : startOfDay();
      to = addDays(typeof req.query.to === "string" ? parseDay(req.query.to) : from, 1);
    } catch {
      throw new HttpError(400, "تاريخ غير صالح");
    }
    if (to <= from || to.getTime() - from.getTime() > 400 * 86400000) throw new HttpError(400, "فترة غير صالحة");
    const at = { gte: from, lt: to };

    const [sales, expenses, purchases, payIn, productions, costs, settings] = await Promise.all([
      prisma.sale.findMany({
        where: { date: at },
        include: {
          items: { include: { product: { select: { id: true, name: true, kind: true, blocksPerUnit: true } } } },
          customer: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.expense.findMany({ where: { date: at } }),
      prisma.purchase.aggregate({ where: { date: at }, _sum: { total: true, paid: true } }),
      prisma.payment.aggregate({ where: { date: at, customerId: { not: null } }, _sum: { amount: true } }),
      prisma.production.aggregate({ where: { date: at }, _sum: { blocks: true, wasted: true } }),
      averageCosts(),
      readSettings(),
    ]);

    const days = new Map<string, { day: string; sales: number; expenses: number }>();
    for (let d = from; d < to; d = addDays(d, 1)) days.set(dayKey(d), { day: dayKey(d), sales: 0, expenses: 0 });
    const products = new Map<number, { name: string; kind: string; qty: number; total: number }>();
    const workers = new Map<string, { name: string; count: number; total: number }>();
    const customers = new Map<string, { name: string; total: number }>();

    let ice = 0, goods = 0, paid = 0, goodsCost = 0, iceBlocks = 0;
    for (const s of sales) {
      paid += s.paid;
      days.get(dayKey(s.date))!.sales += s.total;
      const w = workers.get(s.createdBy.name) ?? { name: s.createdBy.name, count: 0, total: 0 };
      w.count++; w.total += s.total;
      workers.set(w.name, w);
      if (s.customer) {
        const c = customers.get(s.customer.name) ?? { name: s.customer.name, total: 0 };
        c.total += s.total;
        customers.set(c.name, c);
      }
      for (const i of s.items) {
        const line = i.quantity * i.price;
        if (i.product.kind === "ICE") {
          ice += line;
          iceBlocks += i.quantity * Number(i.product.blocksPerUnit);
        } else {
          goods += line;
          goodsCost += i.quantity * (costs.get(i.product.id) ?? 0);
        }
        const p = products.get(i.product.id) ?? { name: i.product.name, kind: i.product.kind, qty: 0, total: 0 };
        p.qty += i.quantity; p.total += line;
        products.set(i.product.id, p);
      }
    }

    const byCategory = new Map<string, number>();
    let expenseTotal = 0;
    for (const e of expenses) {
      expenseTotal += e.amount;
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
      const d = days.get(dayKey(e.date));
      if (d) d.expenses += e.amount;
    }

    const salesTotal = ice + goods;
    const percent = Number(settings.partnerPercent) || 0;
    const owner = req.user!.role === "OWNER";

    return {
      from: dayKey(from),
      to: dayKey(addDays(to, -1)),
      sales: { total: salesTotal, ice, goods, paidNow: paid, onCredit: salesTotal - paid, count: sales.length },
      collected: payIn._sum.amount ?? 0,
      expenses: {
        total: expenseTotal,
        byCategory: [...byCategory].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
      },
      purchases: { total: purchases._sum.total ?? 0, paid: purchases._sum.paid ?? 0 },
      goodsCost: Math.round(goodsCost),
      profit: Math.round(salesTotal - goodsCost - expenseTotal),
      iceBlocks: {
        produced: productions._sum.blocks ?? 0,
        wasted: productions._sum.wasted ?? 0,
        sold: Math.round(iceBlocks),
      },
      partner: owner ? { percent, share: Math.round((ice * percent) / 100) } : null,
      byDay: [...days.values()],
      byProduct: [...products.values()].sort((a, b) => b.total - a.total),
      byWorker: [...workers.values()].sort((a, b) => b.total - a.total),
      topCustomers: [...customers.values()].sort((a, b) => b.total - a.total).slice(0, 8),
    };
  })
);

export default router;
