import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export const getSuppliers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    });

    res.json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { date: "desc" },
          take: 10,
          include: { items: { include: { product: true } } },
        },
      },
    });

    if (!supplier) {
      res.status(404).json({ success: false, error: "المورد غير موجود" });
      return;
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, contact } = req.body as { name: string; contact?: string };

    const supplier = await prisma.supplier.create({
      data: { name, contact },
    });

    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, contact } = req.body as { name?: string; contact?: string };

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (contact !== undefined) data.contact = contact;

    const supplier = await prisma.supplier.update({ where: { id }, data });

    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    const orderCount = await prisma.purchaseOrder.count({
      where: { supplierId: id },
    });

    if (orderCount > 0) {
      res.status(400).json({
        success: false,
        error: "لا يمكن حذف المورد لوجود طلبيات مرتبطة به",
      });
      return;
    }

    await prisma.supplier.delete({ where: { id } });

    res.json({ success: true, data: { message: "تم حذف المورد بنجاح" } });
  } catch (error) {
    next(error);
  }
};
