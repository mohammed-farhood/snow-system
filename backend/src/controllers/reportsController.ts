import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function formatSnowSale(s: Record<string, unknown>) {
  return {
    ...s,
    quantity: Number(s.quantity),
    unitPrice: Number(s.unitPrice),
    amountPaid: Number(s.amountPaid),
    totalAmount: Number(s.quantity) * Number(s.unitPrice),
  };
}

function formatGoodsSale(s: Record<string, unknown>) {
  return {
    ...s,
    totalAmount: Number(s.totalAmount),
    amountPaid: Number(s.amountPaid),
    items: Array.isArray(s.items)
      ? (s.items as Record<string, unknown>[]).map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        }))
      : [],
  };
}

function formatExpense(e: Record<string, unknown>) {
  return { ...e, amount: Number(e.amount) };
}

function formatProduction(p: Record<string, unknown>) {
  return {
    ...p,
    pricePerBlock: Number(p.pricePerBlock),
    pricePerCrushed: Number(p.pricePerCrushed),
  };
}

async function getDayData(date: Date) {
  const from = startOfDay(date);
  const to = endOfDay(date);
  const range = { gte: from, lte: to };

  const [productions, goodsSales, snowSales, expenses] = await Promise.all([
    prisma.snowProduction.findMany({
      where: { date: range },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.goodsSale.findMany({
      where: { date: range },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.snowSale.findMany({
      where: { date: range },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: { date: range },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const goodsRevenue = goodsSales.reduce(
    (sum, s) => sum + Number(s.totalAmount),
    0
  );
  const snowRevenue = snowSales.reduce(
    (sum, s) => sum + Number(s.quantity) * Number(s.unitPrice),
    0
  );
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  return {
    date: from,
    productions: productions.map((p) =>
      formatProduction(p as unknown as Record<string, unknown>)
    ),
    goodsSales: goodsSales.map((s) =>
      formatGoodsSale(s as unknown as Record<string, unknown>)
    ),
    snowSales: snowSales.map((s) =>
      formatSnowSale(s as unknown as Record<string, unknown>)
    ),
    expenses: expenses.map((e) =>
      formatExpense(e as unknown as Record<string, unknown>)
    ),
    summary: {
      goodsRevenue,
      snowRevenue,
      totalRevenue: goodsRevenue + snowRevenue,
      totalExpenses,
      netProfit: goodsRevenue + snowRevenue - totalExpenses,
      blocksProduced: productions.reduce((sum, p) => sum + p.totalBlocks, 0),
      blocksWasted: productions.reduce((sum, p) => sum + p.wastedBlocks, 0),
      goodsSalesCount: goodsSales.length,
      snowSalesCount: snowSales.length,
      expensesCount: expenses.length,
    },
  };
}

// ─── DAILY REPORT ─────────────────────────────────────────────────────────────
export const getDailyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date } = req.query as { date?: string };
    const targetDate = date ? new Date(date) : new Date();

    const data = await getDayData(targetDate);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── WEEKLY REPORT ────────────────────────────────────────────────────────────
export const getWeeklyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date } = req.query as { date?: string };
    const refDate = date ? new Date(date) : new Date();

    // Find Monday of the week
    const day = refDate.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + diffToMonday);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }

    const dayDataArray = await Promise.all(days.map((d) => getDayData(d)));

    const weekSummary = dayDataArray.reduce(
      (acc, d) => ({
        goodsRevenue: acc.goodsRevenue + d.summary.goodsRevenue,
        snowRevenue: acc.snowRevenue + d.summary.snowRevenue,
        totalRevenue: acc.totalRevenue + d.summary.totalRevenue,
        totalExpenses: acc.totalExpenses + d.summary.totalExpenses,
        netProfit: acc.netProfit + d.summary.netProfit,
        blocksProduced: acc.blocksProduced + d.summary.blocksProduced,
        blocksWasted: acc.blocksWasted + d.summary.blocksWasted,
        goodsSalesCount: acc.goodsSalesCount + d.summary.goodsSalesCount,
        snowSalesCount: acc.snowSalesCount + d.summary.snowSalesCount,
        expensesCount: acc.expensesCount + d.summary.expensesCount,
      }),
      {
        goodsRevenue: 0,
        snowRevenue: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        blocksProduced: 0,
        blocksWasted: 0,
        goodsSalesCount: 0,
        snowSalesCount: 0,
        expensesCount: 0,
      }
    );

    res.json({
      success: true,
      data: {
        weekStart: startOfDay(monday),
        weekEnd: endOfDay(days[6]),
        days: dayDataArray.map((d) => ({
          date: d.date,
          summary: d.summary,
          productions: d.productions,
          goodsSalesCount: d.goodsSales.length,
          snowSalesCount: d.snowSales.length,
          expensesCount: d.expenses.length,
        })),
        summary: weekSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── MONTHLY REPORT ───────────────────────────────────────────────────────────
export const getMonthlyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { year, month } = req.query as { year?: string; month?: string };

    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth(); // 0-indexed

    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0);

    const from = startOfDay(firstDay);
    const to = endOfDay(lastDay);
    const range = { gte: from, lte: to };

    // Aggregate all records for the month
    const [goodsSalesAgg, snowSalesRaw, expenseAgg, productionAgg] =
      await Promise.all([
        prisma.goodsSale.aggregate({
          where: { date: range },
          _sum: { totalAmount: true, amountPaid: true },
          _count: true,
        }),
        prisma.snowSale.findMany({
          where: { date: range },
          select: { quantity: true, unitPrice: true, amountPaid: true, paymentType: true },
        }),
        prisma.expense.groupBy({
          by: ["category"],
          where: { date: range },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.snowProduction.aggregate({
          where: { date: range },
          _sum: {
            totalBlocks: true,
            wastedBlocks: true,
            blocksSoldWhole: true,
            blocksSoldCrushed: true,
          },
          _count: true,
        }),
      ]);

    const goodsRevenue = Number(goodsSalesAgg._sum.totalAmount ?? 0);
    const snowRevenue = snowSalesRaw.reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.unitPrice),
      0
    );
    const totalExpenses = expenseAgg.reduce(
      (sum, e) => sum + Number(e._sum.amount ?? 0),
      0
    );

    // Weekly breakdown
    const weeks: Array<{
      weekNum: number;
      from: Date;
      to: Date;
      goodsRevenue: number;
      snowRevenue: number;
      totalRevenue: number;
      totalExpenses: number;
      netProfit: number;
    }> = [];

    const current = new Date(firstDay);
    let weekNum = 1;

    while (current <= lastDay) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());

      const wRange = {
        gte: startOfDay(weekStart),
        lte: endOfDay(weekEnd),
      };

      const [wGoods, wSnowRaw, wExpenses] = await Promise.all([
        prisma.goodsSale.aggregate({
          where: { date: wRange },
          _sum: { totalAmount: true },
        }),
        prisma.snowSale.findMany({
          where: { date: wRange },
          select: { quantity: true, unitPrice: true },
        }),
        prisma.expense.aggregate({
          where: { date: wRange },
          _sum: { amount: true },
        }),
      ]);

      const wGoodsRev = Number(wGoods._sum.totalAmount ?? 0);
      const wSnowRev = wSnowRaw.reduce(
        (sum, s) => sum + Number(s.quantity) * Number(s.unitPrice),
        0
      );
      const wExpTotal = Number(wExpenses._sum.amount ?? 0);

      weeks.push({
        weekNum,
        from: startOfDay(weekStart),
        to: endOfDay(weekEnd),
        goodsRevenue: wGoodsRev,
        snowRevenue: wSnowRev,
        totalRevenue: wGoodsRev + wSnowRev,
        totalExpenses: wExpTotal,
        netProfit: wGoodsRev + wSnowRev - wExpTotal,
      });

      current.setDate(current.getDate() + 7);
      weekNum++;
    }

    // Top products
    const topProducts = await prisma.goodsSaleItem.groupBy({
      by: ["productId"],
      where: { sale: { date: range } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    const topProductDetails = await Promise.all(
      topProducts.map(async (tp) => {
        const product = await prisma.product.findUnique({
          where: { id: tp.productId },
          select: { id: true, name: true, category: true, unit: true },
        });
        return {
          product,
          totalQuantity: Number(tp._sum.quantity ?? 0),
        };
      })
    );

    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth + 1,
        period: { from, to },
        summary: {
          goodsRevenue,
          snowRevenue,
          totalRevenue: goodsRevenue + snowRevenue,
          totalExpenses,
          netProfit: goodsRevenue + snowRevenue - totalExpenses,
          goodsSalesCount: goodsSalesAgg._count,
          snowSalesCount: snowSalesRaw.length,
          blocksProduced: Number(productionAgg._sum.totalBlocks ?? 0),
          blocksWasted: Number(productionAgg._sum.wastedBlocks ?? 0),
          blocksSoldWhole: Number(productionAgg._sum.blocksSoldWhole ?? 0),
          blocksSoldCrushed: Number(productionAgg._sum.blocksSoldCrushed ?? 0),
          batchCount: productionAgg._count,
        },
        expensesByCategory: expenseAgg.map((e) => ({
          category: e.category,
          total: Number(e._sum.amount ?? 0),
          count: e._count,
        })),
        weeklyBreakdown: weeks,
        topProducts: topProductDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── CUSTOM RANGE REPORT ──────────────────────────────────────────────────────
export const getCustomReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query as { from: string; to: string };

    if (!from || !to) {
      res.status(400).json({
        success: false,
        error: "يجب تحديد تاريخ البداية والنهاية",
      });
      return;
    }

    const fromDate = startOfDay(new Date(from));
    const toDate = endOfDay(new Date(to));
    const range = { gte: fromDate, lte: toDate };

    const [goodsSalesAgg, snowSalesRaw, expenseAgg, productionAgg, purchasesAgg] =
      await Promise.all([
        prisma.goodsSale.aggregate({
          where: { date: range },
          _sum: { totalAmount: true, amountPaid: true },
          _count: true,
        }),
        prisma.snowSale.findMany({
          where: { date: range },
          select: { quantity: true, unitPrice: true, amountPaid: true },
        }),
        prisma.expense.aggregate({
          where: { date: range },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.snowProduction.aggregate({
          where: { date: range },
          _sum: { totalBlocks: true, wastedBlocks: true },
          _count: true,
        }),
        prisma.purchaseOrder.aggregate({
          where: { date: range },
          _sum: { totalAmount: true, amountPaid: true },
          _count: true,
        }),
      ]);

    const goodsRevenue = Number(goodsSalesAgg._sum.totalAmount ?? 0);
    const snowRevenue = snowSalesRaw.reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.unitPrice),
      0
    );
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
    const totalPurchases = Number(purchasesAgg._sum.totalAmount ?? 0);

    res.json({
      success: true,
      data: {
        period: { from: fromDate, to: toDate },
        summary: {
          goodsRevenue,
          snowRevenue,
          totalRevenue: goodsRevenue + snowRevenue,
          totalExpenses,
          totalPurchases,
          netProfit: goodsRevenue + snowRevenue - totalExpenses,
          goodsSalesCount: goodsSalesAgg._count,
          snowSalesCount: snowSalesRaw.length,
          expensesCount: expenseAgg._count,
          purchasesCount: purchasesAgg._count,
          blocksProduced: Number(productionAgg._sum.totalBlocks ?? 0),
          blocksWasted: Number(productionAgg._sum.wastedBlocks ?? 0),
          batchCount: productionAgg._count,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── DEBT REPORT ──────────────────────────────────────────────────────────────
export const getDebtReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Outstanding goods debts
    const goodsDebts = await prisma.goodsSale.findMany({
      where: {
        paymentType: { not: "CASH" },
      },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    const formattedGoodsDebts = goodsDebts
      .map((s) => ({
        id: s.id,
        receiptNumber: s.receiptNumber,
        customerName: s.customerName,
        customer: s.customer,
        date: s.date,
        totalAmount: Number(s.totalAmount),
        amountPaid: Number(s.amountPaid),
        remaining: Number(s.totalAmount) - Number(s.amountPaid),
        paymentType: s.paymentType,
        type: "goods" as const,
      }))
      .filter((s) => s.remaining > 0);

    // Outstanding snow debts
    const snowDebts = await prisma.snowSale.findMany({
      where: {
        paymentType: { not: "CASH" },
      },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    const formattedSnowDebts = snowDebts
      .map((s) => ({
        id: s.id,
        receiptNumber: s.receiptNumber,
        customerName: s.customerName,
        customer: s.customer,
        date: s.date,
        totalAmount: Number(s.quantity) * Number(s.unitPrice),
        amountPaid: Number(s.amountPaid),
        remaining:
          Number(s.quantity) * Number(s.unitPrice) - Number(s.amountPaid),
        paymentType: s.paymentType,
        snowType: s.snowType,
        type: "snow" as const,
      }))
      .filter((s) => s.remaining > 0);

    // Supplier debts (unpaid purchases)
    const supplierDebts = await prisma.purchaseOrder.findMany({
      where: { paymentType: { not: "CASH" } },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    const formattedSupplierDebts = supplierDebts
      .map((o) => ({
        id: o.id,
        supplierName: o.supplier.name,
        supplier: o.supplier,
        date: o.date,
        totalAmount: Number(o.totalAmount),
        amountPaid: Number(o.amountPaid),
        remaining: Number(o.totalAmount) - Number(o.amountPaid),
        paymentType: o.paymentType,
      }))
      .filter((o) => o.remaining > 0);

    const totalCustomerDebt =
      formattedGoodsDebts.reduce((sum, d) => sum + d.remaining, 0) +
      formattedSnowDebts.reduce((sum, d) => sum + d.remaining, 0);

    const totalSupplierDebt = formattedSupplierDebts.reduce(
      (sum, d) => sum + d.remaining,
      0
    );

    res.json({
      success: true,
      data: {
        customerDebts: {
          goods: formattedGoodsDebts,
          snow: formattedSnowDebts,
          total: totalCustomerDebt,
        },
        supplierDebts: {
          orders: formattedSupplierDebts,
          total: totalSupplierDebt,
        },
        summary: {
          totalCustomerDebt,
          totalSupplierDebt,
          netDebtPosition: totalCustomerDebt - totalSupplierDebt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
