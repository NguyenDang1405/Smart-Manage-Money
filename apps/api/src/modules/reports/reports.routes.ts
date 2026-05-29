import { Router } from "express";
import { ReportController } from "./reports.controller";
import { authenticate } from "../../middleware/auth.middleware";

const reportsRouter = Router();

reportsRouter.get("/monthly", authenticate, ReportController.getMonthlyReport);

export { reportsRouter };
