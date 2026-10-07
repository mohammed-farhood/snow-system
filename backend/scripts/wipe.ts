// Empties every table. Used by `deploy.sh --fresh` and to check "brand new factory" screens locally.
// Only runs against a database on this same machine (127.0.0.1 / localhost).
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
