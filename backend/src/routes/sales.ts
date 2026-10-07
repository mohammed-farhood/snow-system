import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { h, HttpError, idParam } from "../lib/http";
import { validate } from "../middleware/validate";
import { customerByName } from "../lib/ledger";

const router = Router();

const saleSchema = z.object({
  items: z
    .array(z.object({ productId: z.number().int(), quantity: z.number().int().positive() }))
    .min(1, "اختر شيئاً للبيع"),
  customerName: z.string().max(80).optional().nullable(),
  // Omitted = paid in full. Less than the total = the rest becomes the customer's debt.
  paid: z.number().int().min(0).optional(),
  note: z.string().max(300).optional().nullable(),
});

export const saleInclude = {
  customer: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, name: true, unit: true, kind: true } } } },
} as const;

router.post(
  "/",
  validate(saleSchema),
  h(async (req) => {
    const body = req.body as z.infer<typeof saleSchema>;
    const products = await prisma.product.findMany({
      where: { id: { in: body.items.map((i) => i.productId) }, isActive: true },
    });
    const priceOf = new Map(products.map((p) => [p.id, p.price]));
    const items = body.items.map((i) => {
      const price = priceOf.get(i.productId);
      if (price === undefined) throw new HttpError(400, "منتج غير موجود");
      return { productId: i.productId, quantity: i.quantity, price };
    });
    const total = items.reduce((s, i) => s + i.quantity * i.price, 0);
    const paid = Math.min(body.paid ?? total, total);
    const customerId = await customerByName(body.customerName);
    if (paid < total && !customerId) throw new HttpError(400, "اكتب اسم الزبون حتى نسجّل عليه الدين");

    return prisma.sale.create({
      data: { customerId, total, paid, note: body.note || null, createdById: req.user!.id, items: { create: items } },
      include: saleInclude,
    });
  })
);

router.get(
  "/:id",
  h(async (req) => {
    const sale = await prisma.sale.findUnique({ where: { id: idParam(req) }, include: saleInclude });
    if (!sale) throw new HttpError(404, "الفاتورة غير موجودة");
    return sale;
  })
);

export default router;
