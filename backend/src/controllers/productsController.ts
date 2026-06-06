import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

function formatProduct(p: {
  id: number;
  name: string;
  category: string;
  unit: string;
  sellingPrice: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...p,
    sellingPrice: Number(p.sellingPrice),
  };
}

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { active, category } = req.query as {
      active?: string;
      category?: string;
    };

    const where: Record<string, unknown> = {};
    if (active !== undefined) where.isActive = active === "true";
    if (category) where.category = category;

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    res.json({ success: true, data: products.map(formatProduct) });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      res.status(404).json({ success: false, error: "المنتج غير موجود" });
      return;
    }

    res.json({ success: true, data: formatProduct(product) });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, category, unit, sellingPrice } = req.body as {
      name: string;
      category: string;
      unit: string;
      sellingPrice: number;
    };

    const product = await prisma.product.create({
      data: { name, category, unit, sellingPrice },
    });

    res.status(201).json({ success: true, data: formatProduct(product) });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, unit, sellingPrice, isActive } = req.body as {
      name?: string;
      category?: string;
      unit?: string;
      sellingPrice?: number;
      isActive?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (unit !== undefined) data.unit = unit;
    if (sellingPrice !== undefined) data.sellingPrice = sellingPrice;
    if (isActive !== undefined) data.isActive = isActive;

    const product = await prisma.product.update({ where: { id }, data });

    res.json({ success: true, data: formatProduct(product) });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    // Soft delete
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, data: formatProduct(product) });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    res.json({
      success: true,
      data: categories.map((c) => c.category),
    });
  } catch (error) {
    next(error);
  }
};
