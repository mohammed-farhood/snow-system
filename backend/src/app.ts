import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth";
import salesRoutes from "./routes/sales";
import entriesRoutes from "./routes/entries";
import todayRoutes from "./routes/today";
import peopleRoutes from "./routes/people";
import reportsRoutes from "./routes/reports";
import adminRoutes from "./routes/admin";
import { authenticate } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/errorHandler";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");

const app = express();
app.set("trust proxy", "loopback");
app.use(helmet());
// In production the web app and the API share one domain (nginx), so CORS only matters in development.
if (process.env.NODE_ENV !== "production") app.use(cors());
app.use(morgan(process.env.NODE_ENV === "production" ? "tiny" : "dev"));
app.use(express.json({ limit: "200kb" }));

// Per-IP guard on sign-in, on top of the per-person PIN lockout.
const tries = new Map<string, { n: number; until: number }>();
function loginLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "?";
  const now = Date.now();
  const t = tries.get(key);
  if (!t || t.until < now) tries.set(key, { n: 1, until: now + 10 * 60000 });
  else if (++t.n > 30) {
    res.status(429).json({ success: false, error: "محاولات كثيرة. انتظر قليلاً" });
    return;
  }
  next();
}

app.get("/api/health", (_req, res) => res.json({ success: true, data: { ok: true } }));
app.use("/api/auth/login", loginLimit);
app.use("/api/auth", authRoutes);
app.use("/api", authenticate);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api", entriesRoutes);
app.use("/api", todayRoutes);
app.use("/api", peopleRoutes);
app.use("/api", adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT ?? "3001", 10);
app.listen(PORT, "127.0.0.1", () => console.log(`Snow factory API on http://127.0.0.1:${PORT}`));
