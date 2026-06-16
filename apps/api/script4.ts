import { prisma } from './src/shared/prisma';
async function run() {
  const txs = await prisma.transaction.findMany({ 
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { category: true }
  });
  console.log('Latest 5 txs:');
  for (const tx of txs) {
    console.log(`- ${tx.description}: ${tx.amount} (Cat: ${tx.category?.name} - ${tx.category?.nameVi}) - ID: ${tx.categoryId}`);
  }
}
run();
