import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../lib/prisma";
import { h, HttpError } from "../lib/http";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { readSettings } from "../lib/ledger";

const router = Router();
const MAX_TRIES = 5;
const LOCK_MINUTES = 5;

// The sign-in screen shows people as tiles: tap your name, type your PIN.
router.get(
  "/people",
  h(async () => {
    const [people, settings] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, role: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      }),
      readSettings(),
    ]);
    return { people, factoryName: settings.factoryName };
  })
);

router.post(
  "/login",
  validate(z.object({ userId: z.number().int(), pin: z.string().regex(/^\d{4,6}$/) })),
  h(async (req) => {
    const { userId, pin } = req.body as { userId: number; pin: string };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new HttpError(401, "الرمز غير صحيح");

    if (user.lockedTil && user.lockedTil > new Date()) {
      const mins = Math.ceil((user.lockedTil.getTime() - Date.now()) / 60000);
      throw new HttpError(429, `محاولات كثيرة. جرّب بعد ${mins} دقيقة`);
    }

    if (!(await bcrypt.compare(pin, user.pin))) {
      const failed = user.failedPin + 1;
      await prisma.user.update({
        where: { id: user.id },
        data:
          failed >= MAX_TRIES
            ? { failedPin: 0, lockedTil: new Date(Date.now() + LOCK_MINUTES * 60000) }
            : { failedPin: failed },
      });
      throw new HttpError(401, "الرمز غير صحيح");
    }

    await prisma.user.update({ where: { id: user.id }, data: { failedPin: 0, lockedTil: null } });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "30d",
    });
    return { token, user: { id: user.id, name: user.name, role: user.role } };
  })
);

router.get(
  "/me",
  authenticate,
  h(async (req) => req.user)
);

export default router;
