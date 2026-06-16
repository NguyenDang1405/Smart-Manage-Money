import { Router } from "express";
import { TransactionController } from "./transactions.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { uploadMiddleware } from "../../middleware/upload.middleware";

const transactionsRouter = Router();

transactionsRouter.get("/", authenticate, TransactionController.getTransactions);
transactionsRouter.post(
  "/",
  authenticate,
  uploadMiddleware.single("receipt"),
  TransactionController.createTransaction
);

transactionsRouter.post(
  "/import",
  authenticate,
  uploadMiddleware.single("file"),
  TransactionController.importTransactions
);

transactionsRouter.post(
  "/bulk",
  authenticate,
  TransactionController.bulkCreate
);

transactionsRouter.patch(
  "/:id",
  authenticate,
  uploadMiddleware.single("receipt"),
  TransactionController.updateTransaction
);

transactionsRouter.delete(
  "/:id",
  authenticate,
  TransactionController.deleteTransaction
);

export { transactionsRouter };
