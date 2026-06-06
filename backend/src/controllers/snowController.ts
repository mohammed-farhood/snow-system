import { Request, Response, NextFunction } from "express";
import { PaymentType, SnowType } from "@prisma/client";
import prisma from "../lib/prisma";

// ─── Receipt number generator ─────────────────────────────────────────────────
async function generateSnowReceiptNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const count = await prisma.snowSale.count({
    where: { date: { gte: startOfDay, lte: endOfDay } },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `SNW-${dateStr}-${seq}`;
}

// ─── Format helpers ────────────────────────────────────────────────────────────
function formatProduction(p: Record<string, unknown>) {
  return {
    ...p,
    pricePerBlock: Number(p.pricePerBlock),
    pricePerCrushed: Number(p.pricePerCrushed),
  };
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

// ─── PRODUCTION CRUD ──────────────────────────────────────────────────────────
export const getProductions = async (
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
    } = req.query as {
      page?: string;
      limit?: string;
      from?: string;
      to?: string;
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};

    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [total, productions] = await Promise.all([
      prisma.snowProduction.count({ where }),
      prisma.snowProduction.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        productions: productions.map((p) =>
          formatProduction(p as unknown as Record<string, unknown>)
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

export const getProductionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const production = await prisma.snowProduction.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    if (!production) {
      res.status(404).json({ success: false, error: "سجل الإنتاج غير موجود" });
      return;
    }

    res.json({
      success: true,
      data: formatProduction(production as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const createProduction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      date,
      totalBlocks,
      wastedBlocks,
      blocksSoldWhole,
      blocksSoldCrushed,
      pricePerBlock,
      pricePerCrushed,
      notes,
    } = req.body as {
      date?: string;
      totalBlocks: number;
      wastedBlocks?: number;
      blocksSoldWhole?: number;
      blocksSoldCrushed?: number;
      pricePerBlock: number;
      pricePerCrushed: number;
      notes?: string;
    };

    const production = await prisma.snowProduction.create({
      data: {
        date: date ? new Date(date) : new Date(),
        totalBlocks,
        wastedBlocks: wastedBlocks ?? 0,
        blocksSoldWhole: blocksSoldWhole ?? 0,
        blocksSoldCrushed: blocksSoldCrushed ?? 0,
        pricePerBlock,
        pricePerCrushed,
        notes,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.status(201).json({
      success: true,
      data: formatProduction(production as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const {
      date,
      totalBlocks,
      wastedBlocks,
      blocksSoldWhole,
      blocksSoldCrushed,
      pricePerBlock,
      pricePerCrushed,
      notes,
    } = req.body as {
      date?: string;
      totalBlocks?: number;
      wastedBlocks?: number;
      blocksSoldWhole?: number;
      blocksSoldCrushed?: number;
      pricePerBlock?: number;
      pricePerCrushed?: number;
      notes?: string;
    };

    const data: Record<string, unknown> = {};
    if (date !== undefined) data.date = new Date(date);
    if (totalBlocks !== undefined) data.totalBlocks = totalBlocks;
    if (wastedBlocks !== undefined) data.wastedBlocks = wastedBlocks;
    if (blocksSoldWhole !== undefined) data.blocksSoldWhole = blocksSoldWhole;
    if (blocksSoldCrushed !== undefined) data.blocksSoldCrushed = blocksSoldCrushed;
    if (pricePerBlock !== undefined) data.pricePerBlock = pricePerBlock;
    if (pricePerCrushed !== undefined) data.pricePerCrushed = pricePerCrushed;
    if (notes !== undefined) data.notes = notes;

    const production = await prisma.snowProduction.update({
      where: { id },
      data,
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.json({
      success: true,
      data: formatProduction(production as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await prisma.snowProduction.delete({ where: { id } });
    res.json({ success: true, data: { message: "تم حذف سجل الإنتاج بنجاح" } });
  } catch (error) {
    next(error);
  }
};

// ─── SNOW SALES CRUD ──────────────────────────────────────────────────────────
export const getSnowSales = async (
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
      snowType,
      paymentType,
      customerId,
    } = req.query as {
      page?: string;
      limit?: string;
      from?: string;
      to?: string;
      snowType?: string;
      paymentType?: string;
      customerId?: string;
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};

    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (snowType) where.snowType = snowType as SnowType;
    if (paymentType) where.paymentType = paymentType as PaymentType;
    if (customerId) where.customerId = parseInt(customerId);

    const [total, sales] = await Promise.all([
      prisma.snowSale.count({ where }),
      prisma.snowSale.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: "desc" },
        include: {
          customer: true,
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        sales: sales.map((s) =>
          formatSnowSale(s as unknown as Record<string, unknown>)
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

export const getSnowSaleById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const sale = await prisma.snowSale.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, error: "فاتورة البيع غير موجودة" });
      return;
    }

    res.json({
      success: true,
      data: formatSnowSale(sale as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const createSnowSale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      customerId,
      customerName,
      date,
      snowType,
      quantity,
      unitPrice,
      paymentType,
      amountPaid,
    } = req.body as {
      customerId?: number;
      customerName: string;
      date?: string;
      snowType: SnowType;
      quantity: number;
      unitPrice: number;
      paymentType: PaymentType;
      amountPaid?: number;
    };

    const receiptNumber = await generateSnowReceiptNumber();

    const totalAmount = quantity * unitPrice;
    const resolvedAmountPaid =
      paymentType === PaymentType.CASH
        ? totalAmount
        : paymentType === PaymentType.DEBT
        ? 0
        : (amountPaid ?? 0);

    const sale = await prisma.snowSale.create({
      data: {
        customerId: customerId ?? null,
        customerName,
        receiptNumber,
        date: date ? new Date(date) : new Date(),
        snowType,
        quantity,
        unitPrice,
        paymentType,
        amountPaid: resolvedAmountPaid,
        createdById: req.user!.id,
      },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: formatSnowSale(sale as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const updateSnowSale = async (
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

    const sale = await prisma.snowSale.update({
      where: { id },
      data,
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      data: formatSnowSale(sale as unknown as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSnowSale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await prisma.snowSale.delete({ where: { id } });
    res.json({ success: true, data: { message: "تم حذف فاتورة البيع بنجاح" } });
  } catch (error) {
    next(error);
  }
};
