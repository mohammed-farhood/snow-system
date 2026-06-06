import { Request, Response, NextFunction } from "express";
import { ExpenseCategory } from "@prisma/client";
import prisma from "../lib/prisma";

function formatExpense(e: Record<string, unknown>) {
  return {
    ...e,
    amount: Number(e.amount),
  };
}

export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "20",
      from,
      to,
      category,
    } = req.query as {
      page?: string;
      limit?: string;
      from?: string;
      to?: string;
      category?: string;
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};

    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (category) where.category = category as ExpenseCategory;

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Sum by category for the filtered period
    const summary = await prisma.expense.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const grandTotal = summary.reduce(
      (acc, s) => acc + Number(s._sum.amount ?? 0),
      0
    );

    res.json({
      success: true,
      data: {
        expenses: expenses.map((e) =>
          formatExpense(e as unknown as Record<string, unknown>)
        ),
        summary: summary.map((s) => ({
          category: s.category,
          total: Number(s._sum.amount ?? 0),
          count: s._count,
        })),
        grandTotal,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    if (!expense) {
      res.status(404).json({ success: false, error: "المصروف غير موجود" });
      return;
    }

    res.json({
      success: true,
      data: formatExpense(expense as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, description, amount, date, notes } = req.body as {
      category: ExpenseCategory;
      description?: string;
      amount: number;
      date?: string;
      notes?: string;
    };

    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount,
        date: date ? new Date(date) : new Date(),
        notes,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.status(201).json({
      success: true,
      data: formatExpense(expense as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { category, description, amount, date, notes } = req.body as {
      category?: ExpenseCategory;
      description?: string;
      amount?: number;
      date?: string;
      notes?: string;
    };

    const data: Record<string, unknown> = {};
    if (category !== undefined) data.category = category;
    if (description !== undefined) data.description = description;
    if (amount !== undefined) data.amount = amount;
    if (date !== undefined) data.date = new Date(date);
    if (notes !== undefined) data.notes = notes;

    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.json({
      success: true,
      data: formatExpense(expense as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true, data: { message: "تم حذف المصروف بنجاح" } });
  } catch (error) {
    next(error);
  }
};
