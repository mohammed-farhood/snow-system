import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = err.statusCode ?? 500;
  let message = err.message ?? "حدث خطأ داخلي في الخادم";

  // Prisma-specific error handling
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        statusCode = 409;
        const target = (err.meta?.target as string[]) ?? [];
        message = `القيمة المدخلة مكررة: ${target.join(", ")}`;
        break;
      }
      case "P2025":
        statusCode = 404;
        message = "السجل المطلوب غير موجود";
        break;
      case "P2003":
        statusCode = 400;
        message = "مرجع بيانات غير صالح";
        break;
      case "P2014":
        statusCode = 400;
        message = "العلاقة المطلوبة غير صالحة";
        break;
      default:
        statusCode = 400;
        message = "خطأ في قاعدة البيانات";
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "بيانات غير صالحة لقاعدة البيانات";
  }

  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      message: err.message,
      stack: err.stack,
      code: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `المسار غير موجود: ${req.method} ${req.originalUrl}`,
  });
};
