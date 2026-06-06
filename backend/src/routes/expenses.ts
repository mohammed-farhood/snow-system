import { Router } from "express";
import { z } from "zod";
import { ExpenseCategory, Role } from "@prisma/client";
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expensesController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

const createExpenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().optional(),
  amount: z.number().positive("المبلغ يجب أن يكون موجباً"),
  date: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateExpenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// GET /api/expenses
router.get("/", authorize(Role.OWNER, Role.SUPERVISOR), getExpenses);

// GET /api/expenses/:id
router.get("/:id", authorize(Role.OWNER, Role.SUPERVISOR), getExpenseById);

// POST /api/expenses  (OWNER / SUPERVISOR)
router.post(
  "/",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(createExpenseSchema),
  createExpense
);

// PUT /api/expenses/:id  (OWNER / SUPERVISOR)
router.put(
  "/:id",
  authorize(Role.OWNER, Role.SUPERVISOR),
  validate(updateExpenseSchema),
  updateExpense
);

// DELETE /api/expenses/:id  (OWNER only)
router.delete("/:id", authorize(Role.OWNER), deleteExpense);

export default router;
