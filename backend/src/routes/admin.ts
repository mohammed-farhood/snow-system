// Products & prices, people & PINs, factory settings.
import { Router } from "express";
import { z } from "zod";
import { hashSecret } from "../lib/secret";
import { ProductKind, Role, SecretKind } from "@prisma/client";
import prisma from "../lib/prisma";
import { h, HttpError, idParam } from "../lib/http";
import { validate } from "../middleware/validate";
import { authorize } from "../middleware/auth";
import { goodsStock, iceStock, readSettings } from "../lib/ledger";

const router = Router();
const owner = authorize(Role.OWNER);

router.get(
  "/products",
  h(async () => {
    const [products, goods, ice] = await Promise.all([
      prisma.product.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { id: "asc" }] }),
      goodsStock(),
      iceStock(),
    ]);
    return products.map((p) => {
      const perUnit = Number(p.blocksPerUnit) || 1;
      return {
        ...p,
        blocksPerUnit: perUnit,
        stock: p.kind === "ICE" ? Math.floor(ice / perUnit) : goods.get(p.id) ?? 0,
      };
    });
  })
);

const productSchema = z.object({
  name: z.string().trim().min(1, "اكتب الاسم").max(60),
  kind: z.nativeEnum(ProductKind).default("GOODS"),
  unit: z.string().trim().min(1).max(20).default("حبة"),
  price: z.number().int().min(0),
  blocksPerUnit: z.number().positive().max(100).default(1),
  openingStock: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

router.post(
  "/products",
  owner,
  validate(productSchema),
  h(async (req) => prisma.product.create({ data: req.body }))
);

router.put(
  "/products/:id",
  owner,
  validate(productSchema.partial()),
  h(async (req) => prisma.product.update({ where: { id: idParam(req) }, data: req.body }))
);

router.get(
  "/users",
  owner,
  h(async () =>
    prisma.user.findMany({
      select: { id: true, name: true, role: true, isActive: true, secretKind: true },
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    })
  )
);

// `pin` is the new secret: 4 digits when secretKind is PIN, any words when it is PASSWORD.
const secret = z.string().min(1).max(400);
const shown = { id: true, name: true, role: true, isActive: true, secretKind: true } as const;

router.post(
  "/users",
  owner,
  validate(
    z.object({
      name: z.string().trim().min(1).max(40),
      role: z.nativeEnum(Role),
      secretKind: z.nativeEnum(SecretKind).default("PIN"),
      pin: secret,
    })
  ),
  h(async (req) => {
    const { name, role, secretKind, pin } = req.body;
    return prisma.user.create({ data: { name, role, secretKind, pin: await hashSecret(secretKind, pin) }, select: shown });
  })
);

router.put(
  "/users/:id",
  owner,
  validate(
    z.object({
      name: z.string().trim().min(1).max(40).optional(),
      role: z.nativeEnum(Role).optional(),
      isActive: z.boolean().optional(),
      secretKind: z.nativeEnum(SecretKind).optional(),
      pin: secret.optional(),
    })
  ),
  h(async (req) => {
    const id = idParam(req);
    const { pin, secretKind, ...rest } = req.body as {
      pin?: string;
      secretKind?: SecretKind;
      role?: Role;
      isActive?: boolean;
      name?: string;
    };
    if (id === req.user!.id && ((rest.role && rest.role !== "OWNER") || rest.isActive === false)) {
      throw new HttpError(400, "لا يمكنك إيقاف حسابك أو تغيير صلاحيتك");
    }
    const current = await prisma.user.findUnique({ where: { id }, select: { secretKind: true } });
    if (!current) throw new HttpError(404, "الشخص غير موجود");
    const kind = secretKind ?? current.secretKind;
    if (kind !== current.secretKind && !pin) throw new HttpError(400, "اكتب الرمز أو كلمة السر الجديدة");
    return prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(pin ? { secretKind: kind, pin: await hashSecret(kind, pin), failedPin: 0, lockedTil: null } : {}),
      },
      select: shown,
    });
  })
);

router.get("/settings", h(async () => readSettings()));

router.put(
  "/settings",
  owner,
  validate(
    z.object({
      factoryName: z.string().trim().min(1).max(60).optional(),
      factoryPhone: z.string().trim().max(30).optional(),
      partnerPercent: z.number().min(0).max(100).optional(),
    })
  ),
  h(async (req) => {
    for (const [key, value] of Object.entries(req.body)) {
      await prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
    }
    return readSettings();
  })
);

export default router;
