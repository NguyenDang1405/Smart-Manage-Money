import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { AIService } from "./ai.service";
import { z } from "zod";

const suggestSchema = z.object({
  description: z.string().min(1),
});

const quickInputSchema = z.object({
  text: z.string().min(1).max(500),
});

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "model"]),
    text: z.string()
  })),
});

async function getSuggestion(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("User ID not found");

    const { description } = suggestSchema.parse(req.body);
    const result = await AIService.suggestCategory(userId, description);
    
    ApiResponse.ok(res, result, "AI category suggestion retrieved");
  } catch (error) {
    next(error);
  }
}

async function parseQuickInput(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("User ID not found");

    const { text } = quickInputSchema.parse(req.body);
    const transactions = await AIService.parseQuickInput(userId, text);
    
    ApiResponse.ok(res, { transactions }, "Quick input parsed successfully");
  } catch (error) {
    next(error);
  }
}

async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("User ID not found");

    const { messages } = chatSchema.parse(req.body);
    const result = await AIService.chatWithFinancialContext(userId, messages);
    
    ApiResponse.ok(res, { reply: result }, "Chat response generated");
  } catch (error) {
    next(error);
  }
}

async function getHealthScore(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("User ID not found");

    const result = await AIService.computeHealthScore(userId);
    ApiResponse.ok(res, result, "Financial health score computed");
  } catch (error) {
    next(error);
  }
}

async function getWeeklyInsights(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("User ID not found");

    const result = await AIService.getWeeklyInsights(userId);
    ApiResponse.ok(res, result, "Weekly insights generated");
  } catch (error) {
    next(error);
  }
}

async function getRecurringExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("User ID not found");

    const result = await AIService.getRecurringExpenses(userId);
    ApiResponse.ok(res, result, "Recurring expenses generated");
  } catch (error) {
    next(error);
  }
}

export const AIController = {
  getSuggestion,
  parseQuickInput,
  chat,
  getHealthScore,
  getWeeklyInsights,
  getRecurringExpenses
};
