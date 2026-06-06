import { Request, Response, NextFunction } from "express";
import { PaymentType } from "@prisma/client";
import prisma from "../lib/prisma";

// ─── Receipt number generator ─────────────────────────────────────────────────
async function generateReceiptNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const count = await prisma.goodsSale.count({
    where: { date: { gte: startOfDay, lte: endOfDay } },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `REC-${dateStr}-${seq}`;
}

// ─── Format helper ─────────────────────────────────────────────────────────────
function formatSale(sale: Record<string, unknown>) {
  return {
    ...sale,
    totalAmount: Number(sale.totalAmount),
    amountPaid: Number(sale.amountPaid),
    items: Array.isArray(sale.items)
      ? sale.items.map((item: Record<string, unknown>) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          product: item.product
            ? {
                ...(item.product as Record<string, unknown>),
                sellingPrice: Number(
                  (item.product as Record<string, unknown>).sellingPrice
                ),
              }
            : undefined,
        }))
      : undefined,
  };
}

// ─── GOODS SALES CRUD ─────────────────────────────────────────────────────────
export const getSales = async (
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
      paymentType,
      customerId,
      receiptNumber,
    } = req.query as {
      page?: string;
      limit?: string;
      from?: string;
      to?: string;
      paymentType?: string;
      customerId?: string;
      receiptNumber?: string;
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};

    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (paymentType) where.paymentType = paymentType as PaymentType;
    if (customerId) where.customerId = parseInt(customerId);
    if (receiptNumber) where.receiptNumber = { contains: receiptNumber };

    const [total, sales] = await Promise.all([
      prisma.goodsSale.count({ where }),
      prisma.goodsSale.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: "desc" },
        include: {
          customer: true,
          createdBy: { select: { id: true, name: true } },
          items: { include: { product: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        sales: sales.map((s) =>
          formatSale(s as unknown as Record<string, unknown>)
        ),
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

export const getSaleById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const sale = await prisma.goodsSale.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, error: "الفاتورة غير موجودة" });
      return;
    }

    res.json({ success: true, data: formatSale(sale as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
};

export const getSaleByReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { receiptNumber } = req.params;
    const sale = await prisma.goodsSale.findUnique({
      where: { receiptNumber },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, error: "الفاتورة غير موجودة" });
      return;
    }

    res.json({ success: true, data: formatSale(sale as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
};

export const createSale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      customerId,
      customerName,
      date,
      paymentType,
      amountPaid,
      items,
    } = req.body as {
      customerId?: number;
      customerName: string;
      date?: string;
      paymentType: PaymentType;
      amountPaid?: number;
      items: Array<{ productId: number; quantity: number; unitPrice: number }>;
    };

    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const resolvedAmountPaid =
      paymentType === PaymentType.CASH
        ? totalAmount
        : paymentType === PaymentType.DEBT
        ? 0
        : (amountPaid ?? 0);

    const receiptNumber = await generateReceiptNumber();

    const sale = await prisma.goodsSale.create({
      data: {
        customerId: customerId ?? null,
        customerName,
        receiptNumber,
        date: date ? new Date(date) : new Date(),
        paymentType,
        totalAmount,
        amountPaid: resolvedAmountPaid,
        createdById: req.user!.id,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: formatSale(sale as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const updateSale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { amountPaid, paymentType } = req.body as {
      amountPaid?: number;
      paymentType?: PaymentType;
    };

    const data: Record<string, unknown> = {};
    if (amountPaid !== undefined) data.amountPaid = amountPaid;
    if (paymentType !== undefined) data.paymentType = paymentType;

    const sale = await prisma.goodsSale.update({
      where: { id },
      data,
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    res.json({ success: true, data: formatSale(sale as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
};

export const deleteSale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await prisma.goodsSale.delete({ where: { id } });
    res.json({ success: true, data: { message: "تم حذف الفاتورة بنجاح" } });
  } catch (error) {
    next(error);
  }
};
