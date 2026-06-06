import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/usersController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// All user routes require authentication
router.use(authenticate);

const createUserSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  username: z
    .string()
    .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
    .regex(/^[a-zA-Z0-9_]+$/, "اسم المستخدم يجب أن يحتوي على حروف وأرقام فقط"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  role: z.nativeEnum(Role).default(Role.WORKER),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/users  (OWNER only)
router.get("/", authorize(Role.OWNER), getUsers);

// GET /api/users/:id  (OWNER only)
router.get("/:id", authorize(Role.OWNER), getUserById);

// POST /api/users  (OWNER only)
router.post(
  "/",
  authorize(Role.OWNER),
  validate(createUserSchema),
  createUser
);

// PUT /api/users/:id  (OWNER only)
router.put(
  "/:id",
  authorize(Role.OWNER),
  validate(updateUserSchema),
  updateUser
);

// DELETE /api/users/:id  (OWNER only)
router.delete("/:id", authorize(Role.OWNER), deleteUser);

export default router;
