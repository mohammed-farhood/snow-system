import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean up existing data (in correct order for FK constraints)
  await prisma.goodsSaleItem.deleteMany();
  await prisma.goodsSale.deleteMany();
  await prisma.snowSale.deleteMany();
  await prisma.snowProduction.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  // --- USERS ---
  const salt = 10;

  const owner = await prisma.user.create({
    data: {
      name: "المالك",
      username: "admin",
      password: await bcrypt.hash("admin123", salt),
      role: Role.OWNER,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      name: "المشرف",
      username: "supervisor1",
      password: await bcrypt.hash("pass123", salt),
      role: Role.SUPERVISOR,
    },
  });

  const worker1 = await prisma.user.create({
    data: {
      name: "أحمد",
      username: "worker1",
      password: await bcrypt.hash("pass123", salt),
      role: Role.WORKER,
    },
  });

  const worker2 = await prisma.user.create({
    data: {
      name: "محمد",
      username: "worker2",
      password: await bcrypt.hash("pass123", salt),
      role: Role.WORKER,
    },
  });

  const worker3 = await prisma.user.create({
    data: {
      name: "علي",
      username: "worker3",
      password: await bcrypt.hash("pass123", salt),
      role: Role.WORKER,
    },
  });

  console.log(
    `✅ Created users: ${owner.username}, ${supervisor.username}, ${worker1.username}, ${worker2.username}, ${worker3.username}`
  );

  // --- SUPPLIERS ---
  const supplier1 = await prisma.supplier.create({
    data: {
      name: "شركة الخير",
      contact: "07700000001",
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: "مؤسسة النور",
      contact: "07700000002",
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: "شركة الفجر",
      contact: "07700000003",
    },
  });

  console.log(
    `✅ Created suppliers: ${supplier1.name}, ${supplier2.name}, ${supplier3.name}`
  );

  // --- PRODUCTS ---
  const products = await prisma.product.createMany({
    data: [
      {
        name: "عصير برتقال 250مل",
        category: "عصائر",
        unit: "علبة",
        sellingPrice: 1000,
      },
      {
        name: "عصير تفاح 250مل",
        category: "عصائر",
        unit: "علبة",
        sellingPrice: 1000,
      },
      {
        name: "عصير مانجو 250مل",
        category: "عصائر",
        unit: "علبة",
        sellingPrice: 1000,
      },
      {
        name: "عصير توت 250مل",
        category: "عصائر",
        unit: "علبة",
        sellingPrice: 1000,
      },
      {
        name: "ماء معدني 500مل",
        category: "مياه",
        unit: "زجاجة",
        sellingPrice: 500,
      },
      {
        name: "ماء معدني 1.5 لتر",
        category: "مياه",
        unit: "زجاجة",
        sellingPrice: 1000,
      },
      {
        name: "مشروب غازي 250مل",
        category: "مشروبات غازية",
        unit: "علبة",
        sellingPrice: 1500,
      },
      {
        name: "مشروب غازي 500مل",
        category: "مشروبات غازية",
        unit: "زجاجة",
        sellingPrice: 2000,
      },
      {
        name: "عصير برتقال 1 لتر",
        category: "عصائر",
        unit: "كرتون",
        sellingPrice: 3500,
      },
      {
        name: "ماء معدني كرتون (12×500مل)",
        category: "مياه",
        unit: "كرتون",
        sellingPrice: 5000,
      },
    ],
  });

  console.log(`✅ Created ${products.count} products`);

  // --- CUSTOMERS ---
  await prisma.customer.createMany({
    data: [
      { name: "زبون عام", phone: null },
      { name: "مطعم الأمل", phone: "07701111111" },
      { name: "بقالة النور", phone: "07702222222" },
    ],
  });

  console.log("✅ Created sample customers");

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
