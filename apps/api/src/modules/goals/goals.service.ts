import { prisma } from "../../shared/prisma";
import { HfInference } from '@huggingface/inference';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateGoalDto {
  name: string;
  targetAmount: number;
  deadline: string; // ISO date string
  priority?: "high" | "medium" | "low";
}

export interface UpdateGoalDto {
  name?: string;
  targetAmount?: number;
  deadline?: string;
  priority?: "high" | "medium" | "low";
  status?: "active" | "completed" | "cancelled";
}

export interface GoalProgress {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  deadline: string;
  daysRemaining: number;
  priority: string;
  status: string;
  isCompleted: boolean;
  isOverdue: boolean;
  prediction?: AIPrediction;
}

export interface AIPrediction {
  monthsToGoal: number | null;
  estimatedCompletionDate: string | null;
  isOnTrack: boolean;
  monthlyRequired: number;
  currentMonthlySavings: number;
  shortfallPerMonth: number;
  aiSuggestion: string;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

async function getGoals(userId: string): Promise<GoalProgress[]> {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ priority: "asc" }, { deadline: "asc" }],
  });

  return goals.map((g) => {
    const now = new Date();
    const deadline = new Date(g.deadline);
    const daysRemaining = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

    return {
      id: g.id,
      name: g.name,
      targetAmount: target,
      currentAmount: current,
      percentage,
      deadline: g.deadline.toISOString(),
      daysRemaining,
      priority: g.priority,
      status: g.status,
      isCompleted: g.status === "completed" || percentage >= 100,
      isOverdue: daysRemaining < 0 && g.status === "active",
    };
  });
}

async function getGoalById(userId: string, goalId: string) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      transactions: {
        where: { type: "saving" },
        orderBy: { transactionDate: "desc" },
        take: 10,
        select: { id: true, amount: true, transactionDate: true, description: true },
      },
    },
  });
  return goal;
}

async function createGoal(userId: string, data: CreateGoalDto) {
  // Enforce 5-goal limit
  const activeGoals = await prisma.goal.count({
    where: { userId, status: "active" },
  });
  if (activeGoals >= 5) {
    throw new Error("MAX_GOALS_REACHED");
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      deadline: new Date(data.deadline),
      priority: data.priority || "medium",
      status: "active",
    },
  });
  return goal;
}

async function updateGoal(userId: string, goalId: string, data: UpdateGoalDto) {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new Error("NOT_FOUND");

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.targetAmount && { targetAmount: data.targetAmount }),
      ...(data.deadline && { deadline: new Date(data.deadline) }),
      ...(data.priority && { priority: data.priority }),
      ...(data.status && { status: data.status }),
      updatedAt: new Date(),
    },
  });
  return updated;
}

async function deleteGoal(userId: string, goalId: string) {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new Error("NOT_FOUND");

  // Unlink transactions first
  await prisma.transaction.updateMany({
    where: { goalId, userId },
    data: { goalId: null },
  });

  await prisma.goal.delete({ where: { id: goalId } });
}

// ── Progress (SMM-212) ────────────────────────────────────────────────────────

async function getGoalProgress(userId: string, goalId: string): Promise<GoalProgress> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      transactions: {
        where: { type: "saving" },
        select: { amount: true },
      },
    },
  });

  if (!goal) throw new Error("NOT_FOUND");

  // Sum up all linked saving transactions for accurate current amount
  const savedFromTransactions = goal.transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );
  const currentAmount = Math.max(Number(goal.currentAmount), savedFromTransactions);

  const target = Number(goal.targetAmount);
  const percentage = target > 0 ? Math.min(Math.round((currentAmount / target) * 100), 100) : 0;
  const now = new Date();
  const deadline = new Date(goal.deadline);
  const daysRemaining = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Auto-complete if hit 100%
  if (percentage >= 100 && goal.status === "active") {
    await prisma.goal.update({
      where: { id: goalId },
      data: { status: "completed", currentAmount },
    });
  }

  return {
    id: goal.id,
    name: goal.name,
    targetAmount: target,
    currentAmount,
    percentage,
    deadline: goal.deadline.toISOString(),
    daysRemaining,
    priority: goal.priority,
    status: percentage >= 100 ? "completed" : goal.status,
    isCompleted: percentage >= 100,
    isOverdue: daysRemaining < 0 && goal.status === "active" && percentage < 100,
  };
}

// ── AI Prediction (SMM-217) ───────────────────────────────────────────────────

async function getGoalPrediction(userId: string, goalId: string): Promise<AIPrediction> {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new Error("NOT_FOUND");

  // Get 3-month saving velocity
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentSavings = await prisma.transaction.findMany({
    where: {
      userId,
      type: "saving",
      transactionDate: { gte: threeMonthsAgo },
    },
    select: { amount: true, transactionDate: true },
  });

  const totalSaved3Months = recentSavings.reduce((sum, t) => sum + Number(t.amount), 0);
  const currentMonthlySavings = totalSaved3Months / 3;

  const target = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);
  const remaining = target - current;
  const deadline = new Date(goal.deadline);
  const now = new Date();
  const monthsUntilDeadline =
    (deadline.getFullYear() - now.getFullYear()) * 12 +
    (deadline.getMonth() - now.getMonth());

  const monthlyRequired = monthsUntilDeadline > 0 ? remaining / monthsUntilDeadline : remaining;
  const shortfallPerMonth = Math.max(monthlyRequired - currentMonthlySavings, 0);

  let monthsToGoal: number | null = null;
  let estimatedCompletionDate: string | null = null;

  if (currentMonthlySavings > 0 && remaining > 0) {
    monthsToGoal = Math.ceil(remaining / currentMonthlySavings);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsToGoal);
    estimatedCompletionDate = completionDate.toISOString();
  } else if (remaining <= 0) {
    monthsToGoal = 0;
    estimatedCompletionDate = now.toISOString();
  }

  const isOnTrack = shortfallPerMonth === 0 || remaining <= 0;

  // Fallback suggestion
  let aiSuggestion = isOnTrack
    ? `Bạn đang đi đúng hướng! Tiếp tục tiết kiệm ${currentMonthlySavings.toLocaleString("vi-VN")}đ/tháng để đạt mục tiêu "${goal.name}".`
    : `Để đạt mục tiêu "${goal.name}" đúng hạn, bạn cần tiết kiệm thêm ${shortfallPerMonth.toLocaleString("vi-VN")}đ/tháng. Thử cắt giảm chi tiêu giải trí hoặc ăn uống ngoài.`;

  try {
    const hfApiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
    if (hfApiKey && !hfApiKey.startsWith("your_")) {
      const hf = new HfInference(hfApiKey);

      const prompt = `Người dùng có mục tiêu tài chính: "${goal.name}"
- Số tiền mục tiêu: ${target.toLocaleString("vi-VN")}đ
- Đã tích luỹ: ${current.toLocaleString("vi-VN")}đ (${Math.round((current / target) * 100)}%)
- Còn cần: ${remaining.toLocaleString("vi-VN")}đ
- Deadline: ${deadline.toLocaleDateString("vi-VN")} (còn ${monthsUntilDeadline} tháng)
- Tiết kiệm trung bình 3 tháng gần nhất: ${currentMonthlySavings.toLocaleString("vi-VN")}đ/tháng
- Cần tiết kiệm mỗi tháng để đúng hạn: ${monthlyRequired.toLocaleString("vi-VN")}đ/tháng
- ${isOnTrack ? "Đang đúng tiến độ" : `Thiếu ${shortfallPerMonth.toLocaleString("vi-VN")}đ/tháng`}

Hãy đưa ra 1 lời khuyên cụ thể, thực tế, actionable bằng tiếng Việt (1-2 câu) để giúp người dùng đạt mục tiêu đúng hạn. Tập trung vào số tiền cụ thể cần thay đổi.`;

      const response = await hf.chatCompletion({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      const raw = response.choices[0]?.message?.content?.trim() || "";
      if (raw.length > 20) aiSuggestion = raw;
    }
  } catch {
    // use fallback
  }

  return {
    monthsToGoal,
    estimatedCompletionDate,
    isOnTrack,
    monthlyRequired: Math.round(monthlyRequired),
    currentMonthlySavings: Math.round(currentMonthlySavings),
    shortfallPerMonth: Math.round(shortfallPerMonth),
    aiSuggestion,
  };
}

// ── Contribute savings to goal ────────────────────────────────────────────────

async function contributeToGoal(userId: string, goalId: string, amount: number) {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new Error("NOT_FOUND");

  const newAmount = Number(goal.currentAmount) + amount;
  const isCompleted = newAmount >= Number(goal.targetAmount);

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      currentAmount: newAmount,
      status: isCompleted ? "completed" : "active",
      updatedAt: new Date(),
    },
  });
  return updated;
}

export const GoalsService = {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalProgress,
  getGoalPrediction,
  contributeToGoal,
};

// Refactored: fix(goals): resolve edge case when savings goal target is zero

// Refactored: fix(goals): resolve edge case when savings goal target is zero
