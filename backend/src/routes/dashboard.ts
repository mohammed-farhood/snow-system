import { Router } from "express";
import { Role } from "@prisma/client";
import { getDashboard } from "../controllers/dashboardController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize(Role.OWNER, Role.SUPERVISOR));

// GET /api/dashboard?period=today|week|month|year
router.get("/", getDashboard);

export default router;
