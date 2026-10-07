// Development only: empties the local database so the "brand new factory" screens can be checked.
import { PrismaClient } from "@prisma/client";

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "")) throw new Error("local databases only");
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(
    `TRUNCATE "SaleItem","Sale","PurchaseItem","Purchase","Payment","Expense","Production","Customer","Supplier","Product","User","Setting" RESTART IDENTITY CASCADE`
  );
  await prisma.$disconnect();
  console.log("local database emptied");
}

main();
