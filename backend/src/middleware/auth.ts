import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma";

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "سجّل الدخول أولاً" });
    return;
  }
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { id: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: "سجّل الدخول أولاً" });
      return;
    }
    req.user = { id: user.id, name: user.name, role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: "سجّل الدخول أولاً" });
      return;
    }
    next(error);
  }
};

export const authorize =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "هذا ليس من صلاحيتك" });
      return;
    }
    next();
  };

export const MANAGERS: Role[] = [Role.OWNER, Role.SUPERVISOR];
