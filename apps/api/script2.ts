import { prisma } from './src/shared/prisma';

async function run() {
  const email = 'tranhaduy204@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  
  const cats = await prisma.category.findMany({ where: { userId: user!.id } });
  console.log(cats);
}
run();
