import { Router } from "express";
import { AIController } from "./ai.controller";
import { authenticate } from "../../middleware/auth.middleware";

const aiRouter = Router();

aiRouter.use(authenticate);

aiRouter.post("/suggest-category", AIController.getSuggestion);
aiRouter.post("/quick-input", AIController.parseQuickInput);
aiRouter.post("/chat", AIController.chat);
aiRouter.get("/health-score", AIController.getHealthScore);
aiRouter.get("/insights/weekly", AIController.getWeeklyInsights);
aiRouter.get("/insights/recurring", AIController.getRecurringExpenses);

export { aiRouter };
