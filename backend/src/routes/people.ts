// Customers and suppliers, always with what is still owed.
import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { h, HttpError, idParam } from "../lib/http";
import { validate } from "../middleware/validate";
import { authorize, MANAGERS } from "../middleware/auth";
import { customerBalances, supplierBalances } from "../lib/ledger";
import { saleInclude } from "./sales";

const router = Router();
const edit = z.object({ name: z.string().trim().min(1).max(80), phone: z.string().trim().max(30).optional().nullable() });

router.get(
  "/customers",
  h(async () => {
    const [customers, balances, last] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, name: true, phone: true } }),
      customerBalances(),
      prisma.sale.groupBy({ by: ["customerId"], _max: { date: true }, _count: true }),
    ]);
    const lastOf = new Map(last.map((l) => [l.customerId, l]));
    return customers
      .map((c) => ({
        ...c,
        owed: balances.get(c.id) ?? 0,
        lastSaleAt: lastOf.get(c.id)?._max.date ?? null,
        sales: lastOf.get(c.id)?._count ?? 0,
      }))
      .sort((a, b) => (b.lastSaleAt?.getTime() ?? 0) - (a.lastSaleAt?.getTime() ?? 0));
  })
);

router.get(
  "/customers/:id",
  h(async (req) => {
    const id = idParam(req);
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new HttpError(404, "الزبون غير موجود");
    const [sales, payments, balances] = await Promise.all([
      prisma.sale.findMany({ where: { customerId: id }, include: saleInclude, orderBy: { date: "desc" }, take: 100 }),
      prisma.payment.findMany({
        where: { customerId: id },
        include: { createdBy: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 100,
      }),
      customerBalances(),
    ]);
    return { ...customer, owed: balances.get(id) ?? 0, sales, payments };
  })
);

router.put(
  "/customers/:id",
  authorize(...MANAGERS),
  validate(edit),
  h(async (req) => prisma.customer.update({ where: { id: idParam(req) }, data: req.body }))
);

router.get(
  "/suppliers",
  authorize(...MANAGERS),
  h(async () => {
    const [suppliers, balances] = await Promise.all([
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
      supplierBalances(),
    ]);
    return suppliers.map((s) => ({ ...s, owed: balances.get(s.id) ?? 0 }));
  })
);

router.get(
  "/suppliers/:id",
  authorize(...MANAGERS),
  h(async (req) => {
    const id = idParam(req);
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new HttpError(404, "المورد غير موجود");
    const [purchases, payments, balances] = await Promise.all([
      prisma.purchase.findMany({
        where: { supplierId: id },
        include: { items: { include: { product: { select: { name: true } } } } },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.payment.findMany({ where: { supplierId: id }, orderBy: { date: "desc" }, take: 100 }),
      supplierBalances(),
    ]);
    return { ...supplier, owed: balances.get(id) ?? 0, purchases, payments };
  })
);

router.put(
  "/suppliers/:id",
  authorize(...MANAGERS),
  validate(edit),
  h(async (req) => prisma.supplier.update({ where: { id: idParam(req) }, data: req.body }))
);

export default router;
