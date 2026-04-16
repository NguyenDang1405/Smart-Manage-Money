import "dotenv/config";
import { prisma } from "./shared/prisma";

async function main() {
  console.log("--- DATABASE DUMP ---");
  const users = await prisma.user.findMany();
  console.log(`Users count: ${users.length}`);
  users.forEach((u) => {
    console.log(`- ID: ${u.id}, Email: ${u.email}, Name: ${u.fullName}`);
  });

  const categories = await prisma.category.findMany();
  console.log(`Categories count: ${categories.length}`);
  categories.forEach((c) => {
    console.log(`- ID: ${c.id}, Name: ${c.name}, isSystem: ${c.isSystem}, userId: ${c.userId}`);
  });

  const transactions = await prisma.transaction.findMany();
  console.log(`Transactions count: ${transactions.length}`);

  const budgets = await prisma.budget.findMany();
  console.log(`Budgets count: ${budgets.length}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
