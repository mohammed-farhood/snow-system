import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} from "../controllers/productsController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

const createProductSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  category: z.string().default("عام"),
  unit: z.string().default("حبة"),
  sellingPrice: z.number().positive("السعر يجب أن يكون موجباً"),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  sellingPrice: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/products/categories
router.get("/categories", getCategories);

// GET /api/products
router.get("/", getProducts);

// GET /api/products/:id
router.get("/:id", getProductById);

// POST /api/products  (OWNER / SUPERVISOR)
router.post(
  "/",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(createProductSchema),
  createProduct
);

// PUT /api/products/:id  (OWNER / SUPERVISOR)
router.put(
  "/:id",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(updateProductSchema),
  updateProduct
);

// DELETE /api/products/:id  (OWNER only)
router.delete("/:id", authorize(Role.OWNER), deleteProduct);

export default router;
