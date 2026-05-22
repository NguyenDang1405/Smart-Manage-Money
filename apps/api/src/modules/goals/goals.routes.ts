import { Router } from "express";
import { GoalsController } from "./goals.controller";
import { authenticate } from "../../middleware/auth.middleware";

const goalsRouter = Router();

// CRUD
goalsRouter.get("/", authenticate, GoalsController.getGoals);
goalsRouter.get("/:id", authenticate, GoalsController.getGoalById);
goalsRouter.post("/", authenticate, GoalsController.createGoal);
goalsRouter.patch("/:id", authenticate, GoalsController.updateGoal);
goalsRouter.delete("/:id", authenticate, GoalsController.deleteGoal);

// SMM-212: Progress
goalsRouter.get("/:id/progress", authenticate, GoalsController.getGoalProgress);

// SMM-217: AI Prediction
goalsRouter.get("/:id/prediction", authenticate, GoalsController.getGoalPrediction);

// Contribute savings manually
goalsRouter.post("/:id/contribute", authenticate, GoalsController.contributeToGoal);

export { goalsRouter };
