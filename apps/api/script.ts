import { prisma } from './src/shared/prisma';
import * as TransactionService from './src/modules/transactions/transactions.service';

async function run() {
  const email = 'tranhaduy204@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  
  const result = await TransactionService.getTransactions(user!.id, { page: 1, limit: 10 });
  console.log('--- GET TRANSACTIONS RESULT ---');
  console.log(JSON.stringify(result.meta, null, 2));
}
run();
