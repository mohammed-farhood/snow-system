import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Routes
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import productsRoutes from "./routes/products";
import suppliersRoutes from "./routes/suppliers";
import purchasesRoutes from "./routes/purchases";
import snowRoutes from "./routes/snow";
import salesRoutes from "./routes/sales";
import expensesRoutes from "./routes/expenses";
import customersRoutes from "./routes/customers";
import reportsRoutes from "./routes/reports";
import dashboardRoutes from "./routes/dashboard";

// Middleware
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

// ─── Security & Utilities ─────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

const allowedOrigins = process.env.NODE_ENV === "development"
  ? true  // allow all origins in dev
  : (process.env.CORS_ORIGIN ?? "http://localhost:3000");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      service: "Snow Factory ERP",
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/snow", snowRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);

app.listen(PORT, () => {
  console.log(`\n🏭 Snow Factory ERP Backend`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`✅ API health: http://localhost:${PORT}/api/health\n`);
});

export default app;
