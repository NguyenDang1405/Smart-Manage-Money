import { prisma } from "../src/shared/prisma";
import { TransactionRepository } from "../src/modules/transactions/transactions.repository";

async function run() {
  try {
    const cats = ["Ăn uống", "Mua sắm"];
    const result = await TransactionRepository.findMany({
      where: {
        category: {
          OR: [
            { name: { in: cats } },
            { nameVi: { in: cats } }
          ]
        }
      }
    });
    console.log("Success:", result.total);
  } catch (err) {
    console.error("Prisma Error:", err);
  }
}
run();
