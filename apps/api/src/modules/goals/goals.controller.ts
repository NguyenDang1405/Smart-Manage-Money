import { Request, Response } from "express";
import { GoalsService } from "./goals.service";

async function getGoals(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const goals = await GoalsService.getGoals(userId);
    return res.json({ success: true, data: goals });
  } catch (error: any) {
    console.error("getGoals error:", error);
    return res.status(500).json({ success: false, message: "Lỗi lấy danh sách mục tiêu." });
  }
}

async function getGoalById(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const goal = await GoalsService.getGoalById(userId, req.params.id as string);
    if (!goal) return res.status(404).json({ success: false, message: "Không tìm thấy mục tiêu." });
    return res.json({ success: true, data: goal });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Lỗi lấy mục tiêu." });
  }
}

async function createGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { name, targetAmount, deadline, priority } = req.body;

    if (!name || !targetAmount || !deadline) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc: name, targetAmount, deadline." });
    }

    const goal = await GoalsService.createGoal(userId, {
      name,
      targetAmount: Number(targetAmount),
      deadline,
      priority,
    });

    return res.status(201).json({ success: true, data: goal, message: "Tạo mục tiêu thành công!" });
  } catch (error: any) {
    if (error.message === "MAX_GOALS_REACHED") {
      return res.status(400).json({ success: false, message: "Bạn đã đạt giới hạn 5 mục tiêu đồng thời. Hãy hoàn thành hoặc xoá mục tiêu cũ trước." });
    }
    console.error("createGoal error:", error);
    return res.status(500).json({ success: false, message: "Lỗi tạo mục tiêu." });
  }
}

async function updateGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const goal = await GoalsService.updateGoal(userId, req.params.id as string, req.body);
    return res.json({ success: true, data: goal, message: "Cập nhật mục tiêu thành công!" });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Không tìm thấy mục tiêu." });
    }
    console.error("updateGoal error:", error);
    return res.status(500).json({ success: false, message: "Lỗi cập nhật mục tiêu." });
  }
}

async function deleteGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    await GoalsService.deleteGoal(userId, req.params.id as string);
    return res.json({ success: true, message: "Xoá mục tiêu thành công!" });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Không tìm thấy mục tiêu." });
    }
    console.error("deleteGoal error:", error);
    return res.status(500).json({ success: false, message: "Lỗi xoá mục tiêu." });
  }
}

async function getGoalProgress(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const progress = await GoalsService.getGoalProgress(userId, req.params.id as string);
    return res.json({ success: true, data: progress });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Không tìm thấy mục tiêu." });
    }
    return res.status(500).json({ success: false, message: "Lỗi lấy tiến độ mục tiêu." });
  }
}

async function getGoalPrediction(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const prediction = await GoalsService.getGoalPrediction(userId, req.params.id as string);
    return res.json({ success: true, data: prediction });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Không tìm thấy mục tiêu." });
    }
    console.error("getGoalPrediction error:", error);
    return res.status(500).json({ success: false, message: "Lỗi lấy dự đoán AI." });
  }
}

async function contributeToGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Số tiền đóng góp phải lớn hơn 0." });
    }
    const updated = await GoalsService.contributeToGoal(userId, req.params.id as string, Number(amount));
    return res.json({ success: true, data: updated, message: "Đã cộng tiền vào mục tiêu!" });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Không tìm thấy mục tiêu." });
    }
    return res.status(500).json({ success: false, message: "Lỗi đóng góp vào mục tiêu." });
  }
}

export const GoalsController = {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalProgress,
  getGoalPrediction,
  contributeToGoal,
};
