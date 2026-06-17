import { BudgetRepository } from "./budgets.repository";
import { prisma } from "../../shared/prisma";
import { AppError } from "../../shared/app-error";
import type { GetBudgetsQuery, UpsertBudgetInput } from "./budgets.schema";

import { HfInference } from '@huggingface/inference';

async function getBudgets(userId: string, query: Partial<GetBudgetsQuery> = {}) {
  const currentDate = new Date();
  const month = query.month !== undefined ? query.month : currentDate.getMonth() + 1;
  const year = query.year !== undefined ? query.year : currentDate.getFullYear();

  const budgets = await BudgetRepository.findMany({
    userId,
    month,
    year,
  });

  return {
    month,
    year,
    budgets,
  };
}

async function upsertBudget(userId: string, input: UpsertBudgetInput) {
  let categoryId = input.categoryId;

  if (!categoryId && input.category) {
    const existing = await prisma.category.findFirst({
      where: {
        name: input.category,
        OR: [
          { isSystem: true },
          { userId: userId }
        ]
      },
    });
    if (existing) {
      categoryId = existing.id;
    } else {
      const newCat = await prisma.category.create({
        data: { name: input.category, isSystem: false, userId },
      });
      categoryId = newCat.id;
    }
  }

  if (!categoryId) {
    throw new AppError({
      message: "categoryId or category name is required",
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError({
      message: "Category not found",
      status: 404,
      code: "NOT_FOUND",
    });
  }

  // Ensure category is either system-wide or owned by this user
  if (!category.isSystem && category.userId !== userId) {
    throw new AppError({
      message: `You are not authorized to set budget for this category. Category owner: ${category.userId}, Request user: ${userId}`,
      status: 403,
      code: "FORBIDDEN",
    });
  }

  return BudgetRepository.upsert(userId, {
    categoryId,
    amount: input.amount,
    month: input.month,
    year: input.year,
  });
}

async function getBudgetSummary(userId: string, query: Partial<GetBudgetsQuery> = {}) {
  const currentDate = new Date();
  const month = query.month !== undefined ? query.month : currentDate.getMonth() + 1;
  const year = query.year !== undefined ? query.year : currentDate.getFullYear();

  // 1. Fetch all budgets set for the user in this month and year
  const budgets = await BudgetRepository.findMany({
    userId,
    month,
    year,
  });

  // 2. Fetch all expense transactions for the user in this month and year
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const expenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // 3. Compute total budget, total spent, and category details
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = totalBudget - totalSpent;

  const categoriesSummary = budgets.map((b) => {
    const catExpenses = expenses.filter((e) => e.categoryId === b.categoryId);
    const spentAmount = catExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const percentage = Number(b.amount) > 0 ? Math.round((spentAmount / Number(b.amount)) * 100) : 0;
    
    let threshold: "NONE" | "WARNING" | "DANGER" = "NONE";
    if (percentage >= 100) {
      threshold = "DANGER";
    } else if (percentage >= 80) {
      threshold = "WARNING";
    }

    return {
      categoryId: b.categoryId,
      categoryName: b.category?.name || "Khác",
      budgetAmount: Number(b.amount),
      spentAmount,
      percentage,
      threshold,
    };
  });

  return {
    month,
    year,
    totalBudget,
    totalSpent,
    remaining: remaining > 0 ? remaining : 0,
    categories: categoriesSummary,
  };
}

async function suggestBudgetsWithAI(userId: string, targetMonth?: number, targetYear?: number) {
  // Fetch expenses from the last 3 months relative to targetMonth/targetYear (or now if not provided)
  const referenceDate = (targetMonth !== undefined && targetYear !== undefined) 
    ? new Date(targetYear, targetMonth - 1, 1) 
    : new Date();
    
  const threeMonthsAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 3, 1);
  const currentMonthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  console.log(`Calculating AI suggestions for user ${userId} target ${targetMonth}/${targetYear}. Range: ${threeMonthsAgo.toISOString()} to ${currentMonthStart.toISOString()}`);

  const expenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      transactionDate: {
        gte: threeMonthsAgo,
        lt: currentMonthStart,
      },
    },
    include: {
      category: true,
    },
  });

  // Calculate average spending per category over the last 3 months
  const categorySpending: Record<string, { total: number; count: number; categoryId: number }> = {};
  
  expenses.forEach((expense) => {
    const catName = expense.category?.name || "Khác";
    const amount = Number(expense.amount);
    if (!categorySpending[catName]) {
      categorySpending[catName] = { total: 0, count: 0, categoryId: expense.categoryId || 0 };
    }
    categorySpending[catName].total += amount;
  });

  // Unique months logic to divide properly
  const uniqueMonths = new Set(
    expenses.map((e) => `${e.transactionDate.getFullYear()}-${e.transactionDate.getMonth()}`)
  ).size || 1;
  let historicalContext = [];
  
  // Load all categories that are system-wide OR belong to this user to ensure we suggest budgets for ALL categories
  const allCategories = await prisma.category.findMany({
    where: {
      OR: [
        { isSystem: true },
        { userId: userId }
      ]
    },
  });

  // Deduplicate by name
  const uniqueSystemCategories: typeof allCategories = [];
  const seenNames = new Set();
  for (const cat of allCategories) {
    if (!seenNames.has(cat.name)) {
      seenNames.add(cat.name);
      uniqueSystemCategories.push(cat);
    }
  }

  const defaultBaselines: Record<string, number> = {
    "Thực phẩm & Ăn uống": 4000000,
    "Di chuyển & Xe cộ": 1000000,
    "Nhà cửa & Hóa đơn": 3000000,
    "Giải trí & Mua sắm": 2000000,
    "Khác": 1000000,
  };

  // Build historical context for ALL expense categories
  historicalContext = uniqueSystemCategories
    .filter(c => c.name !== "Lương & Thưởng")
    .map(c => {
      const spending = categorySpending[c.name];
      const averageMonthlySpending = spending 
        ? Math.round(spending.total / uniqueMonths) 
        : 0;
      return {
        categoryId: c.id,
        categoryName: c.name,
        averageMonthlySpending,
      };
    });

  // Fallback to mock data if there is no HuggingFace API key configured
  const hfApiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
  if (!hfApiKey || hfApiKey.startsWith("your_")) {
    return {
      suggestions: historicalContext.map(c => {
        const hasSpending = c.averageMonthlySpending > 0;
        const suggestedAmount = hasSpending 
          ? c.averageMonthlySpending 
          : (defaultBaselines[c.categoryName] || 1000000);
        const reasoning = hasSpending
          ? `Dựa trên trung bình chi tiêu ${c.averageMonthlySpending.toLocaleString('vi-VN')}đ của bạn trong các tháng trước.`
          : `Gợi ý hạn mức cơ bản để bắt đầu quản lý chi tiêu cho danh mục ${c.categoryName}.`;

        return {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          suggestedAmount,
          reasoning,
        };
      }),
      isMock: true,
      message: "Vui lòng cấu hình HF_API_KEY trong .env để nhận gợi ý từ AI."
    };
  }

  // Use HuggingFace Qwen API
  const hf = new HfInference(hfApiKey);
  
  const prompt = `Bạn là một chuyên gia tài chính. Dưới đây là dữ liệu chi tiêu trung bình hàng tháng của một người dùng trong 3 tháng qua:
${JSON.stringify(historicalContext, null, 2)}

Hãy phân tích thói quen và đề xuất hạn mức ngân sách hợp lý (suggestedAmount) cho tháng tới cho TẤT CẢ các danh mục chi tiêu được liệt kê ở trên.
Yêu cầu lập kế hoạch đề xuất:
1. Đối với danh mục đã có dữ liệu chi tiêu (averageMonthlySpending > 0): Đề xuất hạn mức hợp lý giúp họ tiết kiệm hơn (giảm khoảng 5-10% các khoản không cần thiết).
2. Đối với danh mục chưa có chi tiêu (averageMonthlySpending = 0): Đề xuất một hạn mức cơ bản hợp lý (ví dụ: Thực phẩm & Ăn uống: 4tr, Di chuyển: 1tr, Nhà cửa: 3tr, Giải trí: 2tr, Khác: 1tr) để họ bắt đầu kiểm soát chi tiêu cho danh mục đó.
3. Trả về giải thích (reasoning) ngắn gọn bằng tiếng Việt cho từng đề xuất.

Trả về KẾT QUẢ DUY NHẤT LÀ MỘT MẢNG JSON, tuân thủ CẤU TRÚC SAU (không kèm markdown \`\`\`json hay text giải thích ngoài):
[
  {
    "categoryId": (giữ nguyên ID),
    "categoryName": (giữ nguyên Tên),
    "suggestedAmount": (số nguyên, hạn mức bạn gợi ý),
    "reasoning": (Câu giải thích ngắn gọn bằng tiếng Việt vì sao chọn mức này)
  }
]`;

  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.5,
    });
    
    let text = response.choices[0]?.message?.content || "[]";
    // Clean up potential markdown formatting from LLM response
    text = text.replace(/```json\n?|```/g, "").trim();
    
    const suggestions = JSON.parse(text);
    return { suggestions };
  } catch (error) {
    console.error("Lỗi gọi HuggingFace API:", error);
    // Fallback if AI fails
    return {
      suggestions: historicalContext.map(c => {
        const hasSpending = c.averageMonthlySpending > 0;
        const suggestedAmount = hasSpending 
          ? c.averageMonthlySpending 
          : (defaultBaselines[c.categoryName] || 1000000);
        const reasoning = hasSpending
          ? `Dựa trên mức chi tiêu trung bình của bạn.`
          : `Gợi ý hạn mức mặc định cho danh mục ${c.categoryName}.`;

        return {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          suggestedAmount,
          reasoning,
        };
      }),
      isMock: true,
      message: "Không thể kết nối đến AI, hiển thị gợi ý dựa trên trung bình chi tiêu."
    };
  }
}

export const BudgetService = {
  getBudgets,
  upsertBudget,
  getBudgetSummary,
  suggestBudgetsWithAI,
};

// Refactored: fix(budgets): fix incorrect threshold calculation for custom categories

// Refactored: fix(budgets): fix incorrect threshold calculation for custom categories
