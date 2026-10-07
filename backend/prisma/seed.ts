// Seeds the factory.
//   npm run db:seed            -> owner + the two ice products, only if the database is empty
//   SEED_DEMO=1 npm run db:seed -> WIPES everything, then adds demo people, goods and two weeks of activity
// The owner PIN comes from SEED_OWNER_PIN (default 1234 for local use).
import { PrismaClient, ExpenseCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DAY = 86400000;
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

async function wipe() {
  await prisma.$transaction([
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.production.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.product.deleteMany(),
    prisma.user.deleteMany(),
    prisma.setting.deleteMany(),
  ]);
}

async function base() {
  const ownerPin = process.env.SEED_OWNER_PIN ?? "1234";
  const owner = await prisma.user.create({
    data: { name: "المالك", role: "OWNER", pin: await bcrypt.hash(ownerPin, 10) },
  });
  await prisma.product.createMany({
    data: [
      { name: "قالب ثلج", kind: "ICE", unit: "قالب", price: 2500, blocksPerUnit: 1, sortOrder: 1 },
      { name: "ثلج مجروش", kind: "ICE", unit: "كيس", price: 1500, blocksPerUnit: 0.5, sortOrder: 2 },
    ],
  });
  return owner;
}

async function demo(ownerId: number) {
  const pin = await bcrypt.hash("1111", 10);
  const staff = [ownerId];
  for (const [name, role] of [["أبو علي", "SUPERVISOR"], ["حيدر", "WORKER"], ["مصطفى", "WORKER"]] as const) {
    staff.push((await prisma.user.create({ data: { name, role, pin } })).id);
  }

  const goodsData = [
    { name: "ماء صغير", unit: "كارتون", price: 3000, cost: 2200 },
    { name: "ماء كبير", unit: "كارتون", price: 4500, cost: 3500 },
    { name: "بيبسي", unit: "كارتون", price: 9000, cost: 7500 },
    { name: "عصير", unit: "كارتون", price: 7000, cost: 5600 },
    { name: "أكياس نايلون", unit: "ربطة", price: 2000, cost: 1300 },
  ];
  const goods = [];
  for (const [i, g] of goodsData.entries()) {
    goods.push({ ...(await prisma.product.create({ data: { name: g.name, unit: g.unit, price: g.price, sortOrder: i, openingStock: i === 3 ? 45 : 80 }})), cost: g.cost });
  }
  const ice = await prisma.product.findMany({ where: { kind: "ICE" }, orderBy: { sortOrder: "asc" } });

  const customers = [];
  for (const name of ["محل أبو حسين", "مطعم الريم", "كافيه الشط", "سوق الحمد", "أبو زينب (سمك)", "قصّاب الحاج كريم", "عرس بيت جاسم"]) {
    customers.push(await prisma.customer.create({ data: { name } }));
  }
  const suppliers = [];
  for (const name of ["شركة المياه الوطنية", "وكيل بيبسي"]) suppliers.push(await prisma.supplier.create({ data: { name } }));

  const now = Date.now();
  for (let d = 13; d >= 0; d--) {
    const day = now - d * DAY;
    const at = (h: number) => {
      const t = day - (new Date(day).getUTCHours() + 3 - h) * 3600000 + rand(0, 50) * 60000;
      return new Date(Math.min(t, now - rand(1, 120) * 60000)); // nothing in the future today
    };
    if (d === 0 && new Date().getUTCHours() + 3 < 9) continue;

    await prisma.production.create({ data: { date: at(6), blocks: rand(130, 190), wasted: rand(0, 8), createdById: pick(staff) } });

    if (d % 6 === 3) {
      await prisma.purchase.create({
        data: {
          date: at(8),
          supplierId: suppliers[d % 2].id,
          total: 0,
          paid: 0,
          createdById: staff[1],
          items: { create: goods.slice(0, 3).map((g) => ({ productId: g.id, quantity: rand(15, 30), cost: g.cost })) },
        },
      });
    }

    const salesToday = d === 0 ? 9 : rand(14, 24);
    for (let s = 0; s < salesToday; s++) {
      const items = [{ productId: ice[0].id, quantity: rand(1, 12), price: ice[0].price }];
      if (Math.random() < 0.3) items.push({ productId: ice[1].id, quantity: rand(1, 6), price: ice[1].price });
      if (Math.random() < 0.35) {
        const g = pick(goods);
        items.push({ productId: g.id, quantity: rand(1, 3), price: g.price });
      }
      const total = items.reduce((t, i) => t + i.quantity * i.price, 0);
      const regular = Math.random() < 0.5 ? pick(customers) : null;
      const onCredit = regular && Math.random() < 0.35;
      await prisma.sale.create({
        data: {
          date: at(rand(9, 21)),
          customerId: regular?.id ?? null,
          total,
          paid: onCredit ? (Math.random() < 0.5 ? 0 : Math.round(total / 2000) * 1000) : total,
          createdById: pick(staff.slice(1)),
          items: { create: items },
        },
      });
    }

    if (d % 3 === 1) {
      await prisma.payment.create({
        data: { date: at(17), customerId: pick(customers).id, amount: rand(2, 10) * 5000, createdById: staff[1] },
      });
    }
    await prisma.expense.create({ data: { date: at(10), category: "GAS", amount: rand(8, 15) * 1000, createdById: staff[1] } });
    if (d === 10) await prisma.expense.create({ data: { date: at(12), category: "ELECTRICITY", amount: 350000, createdById: ownerId } });
    if (d === 5) await prisma.expense.create({ data: { date: at(12), category: ExpenseCategory.MAINTENANCE, amount: 75000, note: "تصليح ماطور", createdById: staff[1] } });
  }

  // Purchases were created with zero totals; fill them from their lines (half paid on the older one).
  for (const p of await prisma.purchase.findMany({ include: { items: true } })) {
    const total = p.items.reduce((t, i) => t + i.quantity * i.cost, 0);
    await prisma.purchase.update({ where: { id: p.id }, data: { total, paid: p.id % 2 ? total : Math.round(total / 2) } });
  }
}

async function main() {
  if (process.env.SEED_DEMO === "1") {
    await wipe();
    const owner = await base();
    await demo(owner.id);
    console.log("Demo data ready. Owner PIN:", process.env.SEED_OWNER_PIN ?? "1234", "· staff PIN: 1111");
    return;
  }
  if ((await prisma.user.count()) > 0) {
    console.log("Database already has people in it; nothing seeded.");
    return;
  }
  await base();
  console.log("Owner created. PIN:", process.env.SEED_OWNER_PIN ?? "1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
