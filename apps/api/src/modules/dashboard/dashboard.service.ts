import { prisma } from "../../shared/prisma";
import type { GetDashboardSummaryQuery, GetDashboardTrendQuery, GetDashboardCompareQuery } from "./dashboard.schema";

async function getDashboardSummary(userId: string, query: GetDashboardSummaryQuery) {
  const currentDate = new Date();
  const month = query.month !== undefined ? query.month : currentDate.getMonth() + 1;
  const year = query.year !== undefined ? query.year : currentDate.getFullYear();

  // 1. Calculate All-Time Balances (currentBalance = totalIncome - totalExpense)
  const allTimeAggregations = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId },
    _sum: {
      amount: true,
    },
  });

  let totalAllTimeIncome = 0;
  let totalAllTimeExpense = 0;

  for (const agg of allTimeAggregations) {
    const val = Number(agg._sum.amount || 0);
    if (agg.type === 'income') {
      totalAllTimeIncome += Math.abs(val);
    } else {
      totalAllTimeExpense += Math.abs(val);
    }
  }

  const totalBalance = totalAllTimeIncome - totalAllTimeExpense;

  // 2. Fetch specific Month/Year range for flows
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const monthAggregations = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  let totalIncomeMonth = 0;
  let totalExpenseMonth = 0;

  for (const agg of monthAggregations) {
    const val = Number(agg._sum.amount || 0);
    if (agg.type === 'income') {
      totalIncomeMonth += Math.abs(val);
    } else {
      totalExpenseMonth += Math.abs(val);
    }
  }

  // 3. Fetch 5 Recent Transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: [
      { transactionDate: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 5,
    include: {
      category: true,
    },
  });

  // 4. Calculate Category Spending details for specified Month/Year
  const monthExpenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      category: true,
    },
  });

  const categorySums: Record<string, { amount: number; color?: string; id?: number }> = {};
  let totalExpenseAmount = 0;

  monthExpenses.forEach((e) => {
    const catName = e.category?.nameVi || e.category?.name || "Khác";
    const catColor = e.category?.color || "#94A3B8";
    const amount = Number(e.amount);
    totalExpenseAmount += amount;

    if (!categorySums[catName]) {
      categorySums[catName] = { amount: 0, color: catColor, id: e.categoryId || undefined };
    }
    categorySums[catName].amount += amount;
  });

  const colors = ["#0D9488", "#1A6B5A", "#2DD4BF", "#115E59", "#94A3B8"];
  const categorySpending = Object.entries(categorySums).map(([name, data], idx) => {
    const percentage = totalExpenseAmount > 0 ? Math.round((data.amount / totalExpenseAmount) * 100) : 0;
    return {
      categoryId: data.id,
      categoryName: name,
      amount: data.amount,
      percentage,
      color: data.color || colors[idx % colors.length],
    };
  }).sort((a, b) => b.amount - a.amount);

  // 5. Calculate Budget progress for this Month/Year
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      month,
      year,
    },
  });

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpentBudget = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const budgetRemaining = totalBudget - totalSpentBudget;
  const budgetPercentage = totalBudget > 0 ? Math.round((totalSpentBudget / totalBudget) * 100) : 0;

  return {
    month,
    year,
    totalBalance,
    totalIncomeMonth,
    totalExpenseMonth,
    recentTransactions,
    categorySpending,
    budgetProgress: {
      totalBudget,
      totalSpent: totalSpentBudget,
      remaining: budgetRemaining > 0 ? budgetRemaining : 0,
      percentage: Math.min(budgetPercentage, 100),
    },
  };
}

async function getTrend(userId: string, query: GetDashboardTrendQuery) {
  const limit = query.months || query.limit || 6;
  const period = query.period || 'month';
  
  const currentDate = new Date();
  let startDate = new Date();
  
  if (period === 'month') {
    startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - limit + 1, 1);
  } else {
    // week
    startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - (limit * 7));
    startDate.setHours(0,0,0,0);
  }
  
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: startDate,
        lte: currentDate,
      }
    },
    select: {
      transactionDate: true,
      amount: true,
      type: true
    }
  });

  const trendData: Record<string, { label: string, income: number, expense: number, dateValue: number, endOfWeek?: number }> = {};
  
  if (period === 'month') {
    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trendData[key] = { label: `T${d.getMonth() + 1}`, income: 0, expense: 0, dateValue: d.getTime() };
    }
    
    transactions.forEach(t => {
      const d = t.transactionDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (trendData[key]) {
        const val = Number(t.amount);
        if (t.type === 'income') trendData[key].income += val;
        else if (t.type === 'expense') trendData[key].expense += val;
      }
    });
  } else {
    // period === 'week'
    for (let i = limit - 1; i >= 0; i--) {
      const endOfWeek = new Date(currentDate);
      endOfWeek.setDate(currentDate.getDate() - (i * 7));
      endOfWeek.setHours(23, 59, 59, 999);
      
      const startOfWeek = new Date(endOfWeek);
      startOfWeek.setDate(endOfWeek.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const key = `W${i}`;
      const label = `${startOfWeek.getDate()}/${startOfWeek.getMonth()+1}`;
      trendData[key] = { label, income: 0, expense: 0, dateValue: startOfWeek.getTime(), endOfWeek: endOfWeek.getTime() };
    }
    
    transactions.forEach(t => {
      const d = t.transactionDate.getTime();
      for (const key in trendData) {
        const bucket = trendData[key];
        if (d >= bucket.dateValue && d <= bucket.endOfWeek!) {
          const val = Number(t.amount);
          if (t.type === 'income') bucket.income += val;
          else if (t.type === 'expense') bucket.expense += val;
          break;
        }
      }
    });
  }
  
  const result = Object.values(trendData).sort((a, b) => a.dateValue - b.dateValue).map(item => ({
    label: item.label,
    income: item.income,
    expense: item.expense
  }));

  return result;
}

async function getCompare(userId: string, query: GetDashboardCompareQuery) {
  const { m1, m2 } = query;
  
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

  const d1 = parseMonthYear(m1);
  const d2 = parseMonthYear(m2);

  const fetchStats = async (month: number, year: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const aggregations = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    let income = 0;
    let expense = 0;

    for (const agg of aggregations) {
      const val = Number(agg._sum.amount || 0);
      if (agg.type === 'income') {
        income += Math.abs(val);
      } else if (agg.type === 'expense') {
        expense += Math.abs(val);
      }
    }
    
    return { income, expense, label: `${month}/${year}` };
  };

  const stats1 = await fetchStats(d1.month, d1.year);
  const stats2 = await fetchStats(d2.month, d2.year);

  const calcChange = (oldVal: number, newVal: number) => {
    if (oldVal === 0) return newVal === 0 ? 0 : 100;
    return ((newVal - oldVal) / oldVal) * 100;
  };

  const incomeChange = calcChange(stats1.income, stats2.income);
  const expenseChange = calcChange(stats1.expense, stats2.expense);

  return {
    m1: stats1,
    m2: stats2,
    changes: {
      incomePercentage: incomeChange,
      expensePercentage: expenseChange
    }
  };
}

export const DashboardService = {
  getDashboardSummary,
  getTrend,
  getCompare,
};

// Refactored: fix(dashboard): handle blank dashboard state for new users

// Refactored: fix(dashboard): handle blank dashboard state for new users
