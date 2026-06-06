import { Router } from "express";
import { z } from "zod";
import { PaymentType, Role } from "@prisma/client";
import {
  getSales,
  getSaleById,
  getSaleByReceipt,
  createSale,
  updateSale,
  deleteSale,
} from "../controllers/salesController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

const saleItemSchema = z.object({
  productId: z.number().int().positive("معرف المنتج مطلوب"),
  quantity: z.number().positive("الكمية يجب أن تكون موجبة"),
  unitPrice: z.number().positive("السعر يجب أن يكون موجباً"),
});

const createSaleSchema = z.object({
  customerId: z.number().int().positive().optional(),
  customerName: z.string().min(1, "اسم الزبون مطلوب"),
  date: z.string().datetime().optional(),
  paymentType: z.nativeEnum(PaymentType),
  amountPaid: z.number().min(0).optional(),
  items: z.array(saleItemSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
});

const updateSaleSchema = z.object({
  amountPaid: z.number().min(0).optional(),
  paymentType: z.nativeEnum(PaymentType).optional(),
});

// GET /api/sales
router.get("/", getSales);

// GET /api/sales/receipt/:receiptNumber
router.get("/receipt/:receiptNumber", getSaleByReceipt);

// GET /api/sales/:id
router.get("/:id", getSaleById);

// POST /api/sales
router.post("/", validate(createSaleSchema), createSale);

// PUT /api/sales/:id  (OWNER / SUPERVISOR)
router.put(
  "/:id",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(updateSaleSchema),
  updateSale
);

// DELETE /api/sales/:id  (OWNER only)
router.delete("/:id", authorize(Role.OWNER), deleteSale);

export default router;
