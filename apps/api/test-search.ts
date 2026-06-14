import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const searchTerm = "thực phẩm";
  const result = await prisma.transaction.findMany({
    where: {
      OR: [
        { note: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { category: { name: { contains: searchTerm, mode: "insensitive" } } },
        { category: { nameVi: { contains: searchTerm, mode: "insensitive" } } },
      ]
    },
    include: {
      category: true
    }
  });

  console.log("Found transactions:", result.length);
  result.forEach(tx => {
    console.log(`- ID: ${tx.id}, Note: ${tx.note}, Category: ${tx.category?.name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
