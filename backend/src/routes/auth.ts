import { Router } from "express";
import { z } from "zod";
import { login, me, changePassword } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"),
});

// POST /api/auth/login
router.post("/login", validate(loginSchema), login);

// GET /api/auth/me  (protected)
router.get("/me", authenticate, me);

// POST /api/auth/change-password  (protected)
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

export default router;
