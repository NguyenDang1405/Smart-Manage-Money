import { Router } from "express";

import { healthRouter } from "./health/health.routes";
import { authRouter } from "./auth/auth.routes";
import { transactionsRouter } from "./transactions/transactions.routes";
import { categoryRouter } from "./categories/category.routes";
import { aiRouter } from "./ai/ai.routes";
import { uploadRouter } from "./uploads/upload.routes";
import { budgetsRouter } from "./budgets/budgets.routes";
import { dashboardRouter } from "./dashboard/dashboard.routes";
import { reportsRouter } from "./reports/reports.routes";
import { goalsRouter } from "./goals/goals.routes";
import { usersRouter } from "./users/users.routes";

const modulesRouter = Router();

modulesRouter.use("/auth", authRouter);
modulesRouter.use("/transactions", transactionsRouter);
modulesRouter.use("/categories", categoryRouter);
modulesRouter.use("/ai", aiRouter);
modulesRouter.use("/uploads", uploadRouter);
modulesRouter.use("/budgets", budgetsRouter);
modulesRouter.use("/dashboard", dashboardRouter);
modulesRouter.use("/reports", reportsRouter);
modulesRouter.use("/goals", goalsRouter);
modulesRouter.use("/users", usersRouter);
modulesRouter.use(healthRouter);

export { modulesRouter };
