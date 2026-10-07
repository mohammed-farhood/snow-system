import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getSettings, updateSettings } from "../controllers/settingsController";

const router = Router();

router.use(authenticate);

const updateSchema = z.object({
  snowBlockPrice: z.number().positive().optional(),
  snowCrushedPrice: z.number().positive().optional(),
});

router.get("/", getSettings);
router.put("/", authorize(Role.OWNER), validate(updateSchema), updateSettings);

export default router;
