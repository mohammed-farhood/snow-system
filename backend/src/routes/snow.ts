import { Router } from "express";
import { z } from "zod";
import { PaymentType, Role, SnowType } from "@prisma/client";
import {
  getProductions,
  getProductionById,
  createProduction,
  updateProduction,
  deleteProduction,
  getSnowSales,
  getSnowSaleById,
  createSnowSale,
  updateSnowSale,
  deleteSnowSale,
} from "../controllers/snowController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

// ─── Production schemas ───────────────────────────────────────────────────────
const createProductionSchema = z.object({
  date: z.string().datetime().optional(),
  totalBlocks: z.number().int().positive("عدد البلوكات يجب أن يكون موجباً"),
  wastedBlocks: z.number().int().min(0).default(0),
  blocksSoldWhole: z.number().int().min(0).default(0),
  blocksSoldCrushed: z.number().int().min(0).default(0),
  pricePerBlock: z.number().positive("سعر البلوكة يجب أن يكون موجباً"),
  pricePerCrushed: z.number().positive("سعر الثلج المجروش يجب أن يكون موجباً"),
  notes: z.string().optional(),
});

const updateProductionSchema = z.object({
  date: z.string().datetime().optional(),
  totalBlocks: z.number().int().positive().optional(),
  wastedBlocks: z.number().int().min(0).optional(),
  blocksSoldWhole: z.number().int().min(0).optional(),
  blocksSoldCrushed: z.number().int().min(0).optional(),
  pricePerBlock: z.number().positive().optional(),
  pricePerCrushed: z.number().positive().optional(),
  notes: z.string().optional(),
});

// ─── Snow sale schemas ────────────────────────────────────────────────────────
const createSnowSaleSchema = z.object({
  customerId: z.number().int().positive().optional(),
  customerName: z.string().min(1, "اسم الزبون مطلوب"),
  date: z.string().datetime().optional(),
  snowType: z.nativeEnum(SnowType),
  quantity: z.number().positive("الكمية يجب أن تكون موجبة"),
  unitPrice: z.number().positive("السعر يجب أن يكون موجباً"),
  paymentType: z.nativeEnum(PaymentType),
  amountPaid: z.number().min(0).optional(),
});

const updateSnowSaleSchema = z.object({
  amountPaid: z.number().min(0).optional(),
  paymentType: z.nativeEnum(PaymentType).optional(),
  notes: z.string().optional(),
});

// ─── Production routes ────────────────────────────────────────────────────────
// GET /api/snow/productions
router.get("/productions", getProductions);

// GET /api/snow/productions/:id
router.get("/productions/:id", getProductionById);

// POST /api/snow/productions
router.post(
  "/productions",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(createProductionSchema),
  createProduction
);

// PUT /api/snow/productions/:id
router.put(
  "/productions/:id",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(updateProductionSchema),
  updateProduction
);

// DELETE /api/snow/productions/:id  (OWNER only)
router.delete("/productions/:id", authorize(Role.OWNER), deleteProduction);

// ─── Snow sale routes ─────────────────────────────────────────────────────────
// GET /api/snow/sales
router.get("/sales", getSnowSales);

// GET /api/snow/sales/:id
router.get("/sales/:id", getSnowSaleById);

// POST /api/snow/sales
router.post(
  "/sales",
  validate(createSnowSaleSchema),
  createSnowSale
);

// PUT /api/snow/sales/:id
router.put(
  "/sales/:id",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(updateSnowSaleSchema),
  updateSnowSale
);

// DELETE /api/snow/sales/:id  (OWNER only)
router.delete("/sales/:id", authorize(Role.OWNER), deleteSnowSale);

export default router;
