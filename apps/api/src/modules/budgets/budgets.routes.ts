import { Router } from "express";
import { BudgetController } from "./budgets.controller";
import { authenticate } from "../../middleware/auth.middleware";

const budgetsRouter = Router();

budgetsRouter.get("/", authenticate, BudgetController.getBudgets);
budgetsRouter.get("/summary", authenticate, BudgetController.getBudgetSummary);
budgetsRouter.post("/", authenticate, BudgetController.upsertBudget);
budgetsRouter.post("/suggest", authenticate, BudgetController.suggestBudgets);

export { budgetsRouter };
