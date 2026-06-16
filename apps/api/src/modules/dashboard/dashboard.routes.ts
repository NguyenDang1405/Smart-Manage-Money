import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { authenticate } from "../../middleware/auth.middleware";

const dashboardRouter = Router();

dashboardRouter.get("/summary", authenticate, DashboardController.getDashboardSummary);
dashboardRouter.get("/trend", authenticate, DashboardController.getTrend);
dashboardRouter.get("/compare", authenticate, DashboardController.getCompare);

export { dashboardRouter };
