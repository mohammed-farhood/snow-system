import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma";

function dateRange(from: Date, to: Date) {
  return { gte: from, lte: to };
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function getPeriodDates(period: string): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date();
  let from: Date;
  let to: Date;
  let prevFrom: Date;
  let prevTo: Date;

  switch (period) {
    case "today":
      from = startOfDay(now);
      to = endOfDay(now);
      prevFrom = startOfDay(new Date(now.getTime() - 86400000));
      prevTo = endOfDay(new Date(now.getTime() - 86400000));
      break;
    case "week": {
      const day = now.getDay();
      from = startOfDay(new Date(now.getTime() - day * 86400000));
      to = endOfDay(now);
      const weekMs = 7 * 86400000;
      prevFrom = new Date(from.getTime() - weekMs);
      prevTo = new Date(to.getTime() - weekMs);
      break;
    }
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      to = endOfDay(now);
      prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      to = endOfDay(now);
      prevFrom = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      prevTo = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    default:
      from = startOfDay(now);
      to = endOfDay(now);
      prevFrom = startOfDay(new Date(now.getTime() - 86400000));
      prevTo = endOfDay(new Date(now.getTime() - 86400000));
  }

  return { from, to, prevFrom, prevTo };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

async function computeKPIs(from: Date, to: Date) {
  const range = dateRange(from, to);

  // Snow sales revenue
  const snowSalesRaw = await prisma.snowSale.findMany({
    where: { date: range },
    select: { quantity: true, unitPrice: true, amountPaid: true, paymentType: true },
  });
  const snowRevenue = snowSalesRaw.reduce(
    (sum, s) => sum + Number(s.quantity) * Number(s.unitPrice),
    0
  );
  const snowCash = snowSalesRaw
    .filter((s) => s.paymentType === "CASH")
    .reduce((sum, s) => sum + Number(s.quantity) * Number(s.unitPrice), 0);
  const snowDebt = snowSalesRaw
    .filter((s) => s.paymentType !== "CASH")
    .reduce(
      (sum, s) =>
        sum +
        (Number(s.quantity) * Number(s.unitPrice) - Number(s.amountPaid)),
      0
    );

  // Goods sales revenue
  const goodsSalesRaw = await prisma.goodsSale.aggregate({
    where: { date: range },
    _sum: { totalAmount: true, amountPaid: true },
    _count: true,
  });
  const goodsRevenue = Number(goodsSalesRaw._sum.totalAmount ?? 0);
  const goodsDebtRaw = await prisma.goodsSale.aggregate({
    where: { date: range, paymentType: { not: "CASH" } },
    _sum: { totalAmount: true, amountPaid: true },
  });
  const goodsDebt =
    Number(goodsDebtRaw._sum.totalAmount ?? 0) -
    Number(goodsDebtRaw._sum.amountPaid ?? 0);

  // Total revenue and expenses
  const totalRevenue = snowRevenue + goodsRevenue;

  const expensesAgg = await prisma.expense.aggregate({
    where: { date: range },
    _sum: { amount: true },
    _count: true,
  });
  const totalExpenses = Number(expensesAgg._sum.amount ?? 0);

  // Snow production stats
  const productionAgg = await prisma.snowProduction.aggregate({
    where: { date: range },
    _sum: {
      totalBlocks: true,
      wastedBlocks: true,
      blocksSoldWhole: true,
      blocksSoldCrushed: true,
    },
    _count: true,
  });

  const blocksProduced = Number(productionAgg._sum.totalBlocks ?? 0);
  const blocksWasted = Number(productionAgg._sum.wastedBlocks ?? 0);
  const blocksSoldWhole = Number(productionAgg._sum.blocksSoldWhole ?? 0);
  const blocksSoldCrushed = Number(productionAgg._sum.blocksSoldCrushed ?? 0);
  const availableBlocks = blocksProduced - blocksWasted - blocksSoldWhole - blocksSoldCrushed;

  return {
    revenue: {
      total: totalRevenue,
      snow: snowRevenue,
      goods: goodsRevenue,
      snowCash,
      goodsCash: goodsRevenue - goodsDebt,
    },
    expenses: {
      total: totalExpenses,
      count: expensesAgg._count,
    },
    profit: {
      gross: totalRevenue - totalExpenses,
      net: totalRevenue - totalExpenses,
    },
    debt: {
      total: snowDebt + goodsDebt,
      snow: snowDebt,
      goods: goodsDebt,
    },
    snowProduction: {
      batches: productionAgg._count,
      blocksProduced,
      blocksWasted,
      blocksSoldWhole,
      blocksSoldCrushed,
      availableBlocks,
      wasteRate: blocksProduced > 0 ? Math.round((blocksWasted / blocksProduced) * 100 * 10) / 10 : 0,
    },
    coFounderShare: Math.round(snowRevenue * 0.5 * 100) / 100,
  };
}

export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { period = "today" } = req.query as { period?: string };

    const { from, to, prevFrom, prevTo } = getPeriodDates(period);

    const [current, previous] = await Promise.all([
      computeKPIs(from, to),
      computeKPIs(prevFrom, prevTo),
    ]);

    // Top customers by revenue (goods + snow combined, current period)
    const topCustomerGoods = await prisma.goodsSale.groupBy({
      by: ["customerId", "customerName"],
      where: { date: dateRange(from, to) },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    });

    const topCustomerSnow = await prisma.snowSale.findMany({
      where: { date: dateRange(from, to) },
      select: { customerId: true, customerName: true, quantity: true, unitPrice: true },
    });

    const customerMap: Record<
      string,
      { id: number | null; name: string; total: number }
    > = {};

    for (const g of topCustomerGoods) {
      const key = g.customerId ? `c${g.customerId}` : `n${g.customerName}`;
      customerMap[key] = {
        id: g.customerId,
        name: g.customerName,
        total: Number(g._sum.totalAmount ?? 0),
      };
    }
    for (const s of topCustomerSnow) {
      const key = s.customerId ? `c${s.customerId}` : `n${s.customerName}`;
      const amount = Number(s.quantity) * Number(s.unitPrice);
      if (customerMap[key]) {
        customerMap[key].total += amount;
      } else {
        customerMap[key] = { id: s.customerId, name: s.customerName, total: amount };
      }
    }

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Recent transactions (last 10 of each type)
    const [recentGoodsSales, recentSnowSales, recentExpenses] = await Promise.all([
      prisma.goodsSale.findMany({
        orderBy: { date: "desc" },
        take: 5,
        select: {
          id: true,
          receiptNumber: true,
          customerName: true,
          totalAmount: true,
          paymentType: true,
          date: true,
        },
      }),
      prisma.snowSale.findMany({
        orderBy: { date: "desc" },
        take: 5,
        select: {
          id: true,
          receiptNumber: true,
          customerName: true,
          quantity: true,
          unitPrice: true,
          snowType: true,
          paymentType: true,
          date: true,
        },
      }),
      prisma.expense.findMany({
        orderBy: { date: "desc" },
        take: 5,
        select: {
          id: true,
          category: true,
          description: true,
          amount: true,
          date: true,
        },
      }),
    ]);

    const recentTransactions = [
      ...recentGoodsSales.map((s) => ({
        type: "goods_sale" as const,
        id: s.id,
        reference: s.receiptNumber,
        party: s.customerName,
        amount: Number(s.totalAmount),
        paymentType: s.paymentType,
        date: s.date,
      })),
      ...recentSnowSales.map((s) => ({
        type: "snow_sale" as const,
        id: s.id,
        reference: s.receiptNumber,
        party: s.customerName,
        amount: Number(s.quantity) * Number(s.unitPrice),
        paymentType: s.paymentType,
        date: s.date,
        snowType: s.snowType,
      })),
      ...recentExpenses.map((e) => ({
        type: "expense" as const,
        id: e.id,
        reference: `EXP-${e.id}`,
        party: e.description ?? e.category,
        amount: -Number(e.amount),
        paymentType: "CASH" as const,
        date: e.date,
        category: e.category,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Comparison with previous period
    const comparison = {
      revenue: {
        change: calcChange(current.revenue.total, previous.revenue.total),
        current: current.revenue.total,
        previous: previous.revenue.total,
      },
      expenses: {
        change: calcChange(current.expenses.total, previous.expenses.total),
        current: current.expenses.total,
        previous: previous.expenses.total,
      },
      profit: {
        change: calcChange(current.profit.net, previous.profit.net),
        current: current.profit.net,
        previous: previous.profit.net,
      },
      snowRevenue: {
        change: calcChange(current.revenue.snow, previous.revenue.snow),
        current: current.revenue.snow,
        previous: previous.revenue.snow,
      },
    };

    const responseData: Record<string, unknown> = {
      period,
      dateRange: { from, to },
      ...current,
      topCustomers,
      recentTransactions,
      comparison,
    };

    // Co-founder share only visible to OWNER
    if (req.user?.role !== Role.OWNER) {
      delete responseData.coFounderShare;
    }

    res.json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};
