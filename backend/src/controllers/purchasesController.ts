import { Request, Response, NextFunction } from "express";
import { PaymentType } from "@prisma/client";
import prisma from "../lib/prisma";

function formatOrder(order: Record<string, unknown>) {
  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    amountPaid: Number(order.amountPaid),
    items: Array.isArray(order.items)
      ? order.items.map((item: Record<string, unknown>) => ({
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

export const getPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "20",
      supplierId,
      from,
      to,
      paymentType,
    } = req.query as {
      page?: string;
      limit?: string;
      supplierId?: string;
      from?: string;
      to?: string;
      paymentType?: string;
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};

    if (supplierId) where.supplierId = parseInt(supplierId);
    if (paymentType) where.paymentType = paymentType as PaymentType;
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [total, orders] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: "desc" },
        include: {
          supplier: true,
          createdBy: { select: { id: true, name: true, username: true } },
          items: { include: { product: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map((o) => formatOrder(o as unknown as Record<string, unknown>)),
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

export const getPurchaseById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, username: true } },
        items: { include: { product: true } },
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: "طلب الشراء غير موجود" });
      return;
    }

    res.json({ success: true, data: formatOrder(order as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
};

export const createPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      supplierId,
      date,
      paymentType,
      amountPaid,
      notes,
      items,
    } = req.body as {
      supplierId: number;
      date?: string;
      paymentType: PaymentType;
      amountPaid?: number;
      notes?: string;
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

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        date: date ? new Date(date) : new Date(),
        paymentType,
        totalAmount,
        amountPaid: resolvedAmountPaid,
        notes,
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
        supplier: true,
        createdBy: { select: { id: true, name: true, username: true } },
        items: { include: { product: true } },
      },
    });

    res.status(201).json({ success: true, data: formatOrder(order as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
};

export const updatePurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { amountPaid, paymentType, notes } = req.body as {
      amountPaid?: number;
      paymentType?: PaymentType;
      notes?: string;
    };

    const data: Record<string, unknown> = {};
    if (amountPaid !== undefined) data.amountPaid = amountPaid;
    if (paymentType !== undefined) data.paymentType = paymentType;
    if (notes !== undefined) data.notes = notes;

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data,
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, username: true } },
        items: { include: { product: true } },
      },
    });

    res.json({ success: true, data: formatOrder(order as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
};

export const deletePurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    await prisma.purchaseOrder.delete({ where: { id } });

    res.json({ success: true, data: { message: "تم حذف طلب الشراء بنجاح" } });
  } catch (error) {
    next(error);
  }
};
