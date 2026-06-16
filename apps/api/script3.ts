import { prisma } from './src/shared/prisma';
async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'tranhaduy204@gmail.com' } });
  if (!user) return console.log('No user');
  console.log('UserId:', user.id);
  const txs = await prisma.transaction.findMany({ where: { userId: user.id } });
  console.log('Total txs:', txs.length);
  
  if (txs.length > 0) {
    console.log('First tx:', txs[0]);
  }
}
run();
