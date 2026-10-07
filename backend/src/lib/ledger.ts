import prisma from "./prisma";

/** Blocks of ice on hand: everything produced, minus waste, minus what sales used up. */
export async function iceStock(): Promise<number> {
  const [prod, sold] = await Promise.all([
    prisma.production.aggregate({ _sum: { blocks: true, wasted: true } }),
    prisma.$queryRaw<{ used: number | null }[]>`
      SELECT SUM(si.quantity * p."blocksPerUnit")::float AS used
      FROM "SaleItem" si JOIN "Product" p ON p.id = si."productId"
      WHERE p.kind = 'ICE'`,
  ]);
  const made = (prod._sum.blocks ?? 0) - (prod._sum.wasted ?? 0);
  return Math.floor(made - (sold[0]?.used ?? 0));
}

/** Units on hand per goods product: opening + bought − sold. */
export async function goodsStock(): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<{ id: number; stock: number }[]>`
    SELECT p.id,
      (p."openingStock"
        + COALESCE((SELECT SUM(quantity) FROM "PurchaseItem" WHERE "productId" = p.id), 0)
        - COALESCE((SELECT SUM(quantity) FROM "SaleItem" WHERE "productId" = p.id), 0))::int AS stock
    FROM "Product" p WHERE p.kind = 'GOODS'`;
  return new Map(rows.map((r) => [r.id, r.stock]));
}

/** What each customer still owes: unpaid part of their sales minus later payments. */
export async function customerBalances(): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<{ id: number; owed: number }[]>`
    SELECT c.id,
      (COALESCE((SELECT SUM(total - paid) FROM "Sale" WHERE "customerId" = c.id), 0)
        - COALESCE((SELECT SUM(amount) FROM "Payment" WHERE "customerId" = c.id), 0))::int AS owed
    FROM "Customer" c`;
  return new Map(rows.map((r) => [r.id, r.owed]));
}

/** What the factory still owes each supplier. */
export async function supplierBalances(): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<{ id: number; owed: number }[]>`
    SELECT s.id,
      (COALESCE((SELECT SUM(total - paid) FROM "Purchase" WHERE "supplierId" = s.id), 0)
        - COALESCE((SELECT SUM(amount) FROM "Payment" WHERE "supplierId" = s.id), 0))::int AS owed
    FROM "Supplier" s`;
  return new Map(rows.map((r) => [r.id, r.owed]));
}

/** Average purchase cost per goods product, to estimate the cost of what was sold. */
export async function averageCosts(): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<{ id: number; avg: number }[]>`
    SELECT "productId" AS id, (SUM(quantity * cost)::float / NULLIF(SUM(quantity), 0)) AS avg
    FROM "PurchaseItem" GROUP BY "productId"`;
  return new Map(rows.map((r) => [r.id, r.avg ?? 0]));
}

const DEFAULT_SETTINGS = {
  factoryName: "مصنع الثلج",
  factoryPhone: "",
  partnerPercent: "50",
};
export type Settings = typeof DEFAULT_SETTINGS;

export async function readSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as keyof Settings] = r.value;
  return out;
}

/** Finds a customer by exact name or creates one. Returns null for a walk-in cash sale. */
export async function customerByName(name?: string | null): Promise<number | null> {
  const clean = name?.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  const c = await prisma.customer.upsert({ where: { name: clean }, update: {}, create: { name: clean } });
  return c.id;
}

export async function supplierByName(name: string): Promise<number> {
  const clean = name.trim().replace(/\s+/g, " ");
  const s = await prisma.supplier.upsert({ where: { name: clean }, update: {}, create: { name: clean } });
  return s.id;
}
