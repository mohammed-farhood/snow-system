// Production, expenses, debt payments and purchases: the small daily entries.
import { Router } from "express";
import { z } from "zod";
import { ExpenseCategory } from "@prisma/client";
import prisma from "../lib/prisma";
import { h, HttpError } from "../lib/http";
import { validate } from "../middleware/validate";
import { authorize, MANAGERS } from "../middleware/auth";
import { supplierByName } from "../lib/ledger";

const router = Router();
const note = z.string().max(300).optional().nullable();

router.post(
  "/production",
  validate(z.object({ blocks: z.number().int().min(0), wasted: z.number().int().min(0).default(0), note })),
  h(async (req) => {
    const { blocks, wasted, note } = req.body;
    if (blocks === 0 && wasted === 0) throw new HttpError(400, "اكتب عدد القوالب");
    return prisma.production.create({ data: { blocks, wasted, note: note || null, createdById: req.user!.id } });
  })
);

router.post(
  "/expenses",
  authorize(...MANAGERS),
  validate(z.object({ category: z.nativeEnum(ExpenseCategory), amount: z.number().int().positive(), note })),
  h(async (req) => {
    const { category, amount, note } = req.body;
    return prisma.expense.create({ data: { category, amount, note: note || null, createdById: req.user!.id } });
  })
);

// Money a customer brings in for an old debt, or money we pay a supplier.
router.post(
  "/payments",
  validate(
    z.object({
      customerId: z.number().int().optional(),
      supplierId: z.number().int().optional(),
      amount: z.number().int().positive("اكتب المبلغ"),
      note,
    })
  ),
  h(async (req) => {
    const { customerId, supplierId, amount, note } = req.body;
    if (!!customerId === !!supplierId) throw new HttpError(400, "اختر زبوناً أو مورداً");
    if (supplierId && req.user!.role === "WORKER") throw new HttpError(403, "هذا ليس من صلاحيتك");
    return prisma.payment.create({
      data: { customerId, supplierId, amount, note: note || null, createdById: req.user!.id },
      include: { customer: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
    });
  })
);

router.post(
  "/purchases",
  authorize(...MANAGERS),
  validate(
    z.object({
      supplierName: z.string().trim().min(1, "اكتب اسم المورد").max(80),
      items: z
        .array(z.object({ productId: z.number().int(), quantity: z.number().int().positive(), cost: z.number().int().min(0) }))
        .min(1, "أضف مادة واحدة على الأقل"),
      paid: z.number().int().min(0).optional(),
      note,
    })
  ),
  h(async (req) => {
    const { supplierName, items, paid, note } = req.body as {
      supplierName: string;
      items: { productId: number; quantity: number; cost: number }[];
      paid?: number;
      note?: string;
    };
    const total = items.reduce((s, i) => s + i.quantity * i.cost, 0);
    const supplierId = await supplierByName(supplierName);
    return prisma.purchase.create({
      data: {
        supplierId,
        total,
        paid: Math.min(paid ?? total, total),
        note: note || null,
        createdById: req.user!.id,
        items: { create: items },
      },
      include: { supplier: true, items: { include: { product: { select: { name: true } } } } },
    });
  })
);

export default router;
