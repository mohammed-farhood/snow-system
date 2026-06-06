import { Router } from "express";
import { Role } from "@prisma/client";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getCustomReport,
  getDebtReport,
} from "../controllers/reportsController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize(Role.OWNER, Role.SUPERVISOR));

// GET /api/reports/daily?date=YYYY-MM-DD
router.get("/daily", getDailyReport);

// GET /api/reports/weekly?date=YYYY-MM-DD  (any date within the desired week)
router.get("/weekly", getWeeklyReport);

// GET /api/reports/monthly?year=YYYY&month=MM
router.get("/monthly", getMonthlyReport);

// GET /api/reports/custom?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/custom", getCustomReport);

// GET /api/reports/debt
router.get("/debt", getDebtReport);

export default router;
