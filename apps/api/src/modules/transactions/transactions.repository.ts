import { prisma } from "../../shared/prisma";
import type { Prisma } from "@prisma/client";

async function findMany(params: {
  skip?: number;
  take?: number;
  where?: Prisma.TransactionWhereInput;
  orderBy?: Prisma.TransactionOrderByWithRelationInput;
}) {
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
      include: {
        category: true,
      },
    }),
    prisma.transaction.count({
      where: params.where,
    }),
  ]);

  return { transactions, total };
}

async function create(data: Prisma.TransactionUncheckedCreateInput) {
  return prisma.transaction.create({
    data,
    include: {
      category: true,
    },
  });
}

async function update(id: string, data: Prisma.TransactionUncheckedUpdateInput) {
  return prisma.transaction.update({
    where: { id },
    data,
    include: {
      category: true,
    },
  });
}

async function deleteTx(id: string) {
  return prisma.transaction.delete({
    where: { id },
  });
}

export const TransactionRepository = {
  findMany,
  create,
  update,
  delete: deleteTx,
};

// Refactored: perf(transactions): optimize database query for monthly transaction logs

// Refactored: perf(transactions): optimize database query for monthly transaction logs
