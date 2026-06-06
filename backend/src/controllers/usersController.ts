import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma";

const userSelect = {
  id: true,
  name: true,
  username: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      res.status(404).json({ success: false, error: "المستخدم غير موجود" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, username, password, role } = req.body as {
      name: string;
      username: string;
      password: string;
      role: Role;
    };

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, username, password: hashedPassword, role },
      select: userSelect,
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, username, role, isActive, password } = req.body as {
      name?: string;
      username?: string;
      role?: Role;
      isActive?: boolean;
      password?: string;
    };

    // Prevent deactivating the last owner
    if (isActive === false) {
      const currentUser = await prisma.user.findUnique({ where: { id } });
      if (currentUser?.role === Role.OWNER) {
        const ownerCount = await prisma.user.count({
          where: { role: Role.OWNER, isActive: true },
        });
        if (ownerCount <= 1) {
          res.status(400).json({
            success: false,
            error: "لا يمكن تعطيل المالك الوحيد",
          });
          return;
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (req.user?.id === id) {
      res.status(400).json({ success: false, error: "لا يمكنك حذف حسابك الخاص" });
      return;
    }

    // Prevent deleting the last owner
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (targetUser?.role === Role.OWNER) {
      const ownerCount = await prisma.user.count({ where: { role: Role.OWNER } });
      if (ownerCount <= 1) {
        res.status(400).json({ success: false, error: "لا يمكن حذف المالك الوحيد" });
        return;
      }
    }

    // Soft delete by deactivating instead of hard delete to preserve history
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: userSelect,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
