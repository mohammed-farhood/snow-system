import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/suppliersController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

const createSupplierSchema = z.object({
  name: z.string().min(1, "اسم المورد مطلوب"),
  contact: z.string().optional(),
});

const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().optional().nullable(),
});

// GET /api/suppliers
router.get("/", getSuppliers);

// GET /api/suppliers/:id
router.get("/:id", getSupplierById);

// POST /api/suppliers  (OWNER / SUPERVISOR)
router.post(
  "/",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(createSupplierSchema),
  createSupplier
);

// PUT /api/suppliers/:id  (OWNER / SUPERVISOR)
router.put(
  "/:id",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(updateSupplierSchema),
  updateSupplier
);

// DELETE /api/suppliers/:id  (OWNER only)
router.delete("/:id", authorize(Role.OWNER), deleteSupplier);

export default router;
