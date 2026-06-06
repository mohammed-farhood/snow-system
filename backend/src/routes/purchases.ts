import { Router } from "express";
import { z } from "zod";
import { PaymentType, Role } from "@prisma/client";
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from "../controllers/purchasesController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

const purchaseItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive("الكمية يجب أن تكون موجبة"),
  unitPrice: z.number().positive("سعر الوحدة يجب أن يكون موجباً"),
});

const createPurchaseSchema = z.object({
  supplierId: z.number().int().positive("المورد مطلوب"),
  date: z.string().datetime().optional(),
  paymentType: z.nativeEnum(PaymentType),
  amountPaid: z.number().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
});

const updatePurchaseSchema = z.object({
  amountPaid: z.number().min(0).optional(),
  paymentType: z.nativeEnum(PaymentType).optional(),
  notes: z.string().optional(),
});

// GET /api/purchases
router.get("/", authorize(Role.OWNER, Role.SUPERVISOR), getPurchases);

// GET /api/purchases/:id
router.get("/:id", authorize(Role.OWNER, Role.SUPERVISOR), getPurchaseById);

// POST /api/purchases  (OWNER / SUPERVISOR)
router.post(
  "/",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(createPurchaseSchema),
  createPurchase
);

// PUT /api/purchases/:id  (OWNER / SUPERVISOR)
router.put(
  "/:id",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(updatePurchaseSchema),
  updatePurchase
);

// DELETE /api/purchases/:id  (OWNER only)
router.delete("/:id", authorize(Role.OWNER), deletePurchase);

export default router;
