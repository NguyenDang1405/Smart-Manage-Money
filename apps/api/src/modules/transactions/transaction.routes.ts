import { Router } from "express";
import { TransactionController } from "./transaction.controller";
import { authenticate } from "../../middleware/auth.middleware";

const transactionRouter = Router();

// Protect all transaction routes
transactionRouter.use(authenticate);

transactionRouter.post("/", TransactionController.createTransaction);

export { transactionRouter };
