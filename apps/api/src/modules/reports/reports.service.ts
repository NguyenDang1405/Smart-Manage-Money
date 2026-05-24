import { prisma } from "../../shared/prisma";
import type { GetMonthlyReportQuery } from "./reports.schema";

async function getMonthlyReport(userId: string, query: GetMonthlyReportQuery) {
  const parseMonthYear = (val: string) => {
    if (val.includes('/')) {
       const [m, y] = val.split('/');
       return { month: parseInt(m, 10), year: parseInt(y, 10) };
    } else if (val.includes('-')) {
       const [y, m] = val.split('-');
       return { month: parseInt(m, 10), year: parseInt(y, 10) };
    }
    const d = new Date(val);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  };

  const { month, year } = parseMonthYear(query.month);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      category: true
    },
    orderBy: { transactionDate: 'desc' }
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap: Record<string, number> = {};

  transactions.forEach(t => {
    const amount = Number(t.amount);
    if (t.type === 'income') {
      totalIncome += amount;
    } else if (t.type === 'expense') {
      totalExpense += amount;
      const catName = t.category?.name || 'Khác';
      categoryMap[catName] = (categoryMap[catName] || 0) + amount;
    }
  });

  const categorySpending = Object.entries(categoryMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    period: `${month}/${year}`,
    totalIncome,
    totalExpense,
    netSaving: totalIncome - totalExpense,
    categorySpending,
    transactions: transactions.map(t => ({
      id: t.id,
      date: t.transactionDate.toLocaleDateString('vi-VN'),
      note: t.note,
      amount: Number(t.amount),
      type: t.type,
      categoryName: t.category?.name || 'Khác'
    }))
  };
}

export const ReportService = { getMonthlyReport };

// Refactored: fix(reports): format currency values correctly in chart labels
