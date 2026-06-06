import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search } = req.query as { search?: string };

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { goodsSales: true, snowSales: true } },
      },
    });

    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        goodsSales: {
          orderBy: { date: "desc" },
          take: 10,
          include: { items: { include: { product: true } } },
        },
        snowSales: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: "الزبون غير موجود" });
      return;
    }

    // Compute total debt
    const goodsDebt = await prisma.goodsSale.aggregate({
      where: { customerId: id },
      _sum: { totalAmount: true, amountPaid: true },
    });
    const snowDebt = await prisma.snowSale.aggregate({
      where: { customerId: id },
      _sum: { quantity: true, amountPaid: true },
    });

    const totalGoodsPurchased = Number(goodsDebt._sum.totalAmount ?? 0);
    const totalGoodsPaid = Number(goodsDebt._sum.amountPaid ?? 0);

    const snowSalesRaw = await prisma.snowSale.findMany({
      where: { customerId: id },
      select: { quantity: true, unitPrice: true, amountPaid: true },
    });
    const totalSnowPurchased = snowSalesRaw.reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.unitPrice),
      0
    );
    const totalSnowPaid = snowSalesRaw.reduce(
      (sum, s) => sum + Number(s.amountPaid),
      0
    );

    const formattedCustomer = {
      ...customer,
      goodsSales: customer.goodsSales.map((s) => ({
        ...s,
        totalAmount: Number(s.totalAmount),
        amountPaid: Number(s.amountPaid),
        items: s.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          product: { ...i.product, sellingPrice: Number(i.product.sellingPrice) },
        })),
      })),
      snowSales: customer.snowSales.map((s) => ({
        ...s,
        quantity: Number(s.quantity),
        unitPrice: Number(s.unitPrice),
        amountPaid: Number(s.amountPaid),
      })),
      stats: {
        totalGoodsPurchased,
        totalGoodsPaid,
        goodsDebt: totalGoodsPurchased - totalGoodsPaid,
        totalSnowPurchased,
        totalSnowPaid,
        snowDebt: totalSnowPurchased - totalSnowPaid,
        totalDebt:
          totalGoodsPurchased -
          totalGoodsPaid +
          (totalSnowPurchased - totalSnowPaid),
      },
    };

    res.json({ success: true, data: formattedCustomer });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, phone } = req.body as { name: string; phone?: string };

    const customer = await prisma.customer.create({
      data: { name, phone },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone } = req.body as { name?: string; phone?: string };

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;

    const customer = await prisma.customer.update({ where: { id }, data });

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    const [goodsCount, snowCount] = await Promise.all([
      prisma.goodsSale.count({ where: { customerId: id } }),
      prisma.snowSale.count({ where: { customerId: id } }),
    ]);

    if (goodsCount > 0 || snowCount > 0) {
      res.status(400).json({
        success: false,
        error: "لا يمكن حذف الزبون لوجود مبيعات مرتبطة به",
      });
      return;
    }

    await prisma.customer.delete({ where: { id } });
    res.json({ success: true, data: { message: "تم حذف الزبون بنجاح" } });
  } catch (error) {
    next(error);
  }
};
