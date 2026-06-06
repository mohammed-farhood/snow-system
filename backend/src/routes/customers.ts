import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customersController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

const createCustomerSchema = z.object({
  name: z.string().min(1, "اسم الزبون مطلوب"),
  phone: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
});

// GET /api/customers
router.get("/", getCustomers);

// GET /api/customers/:id
router.get("/:id", getCustomerById);

// POST /api/customers
router.post("/", validate(createCustomerSchema), createCustomer);

// PUT /api/customers/:id
router.put("/:id", validate(updateCustomerSchema), updateCustomer);

// DELETE /api/customers/:id  (OWNER / SUPERVISOR)
router.delete(
  "/:id",
  authorize(Role.OWNER, Role.SUPERVISOR),
  deleteCustomer
);

export default router;
