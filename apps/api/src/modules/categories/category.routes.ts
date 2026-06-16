import { Router } from "express";
import { CategoryController } from "./category.controller";
import { authenticate } from "../../middleware/auth.middleware";

const categoryRouter = Router();

categoryRouter.use(authenticate);

categoryRouter.post("/", CategoryController.createCategory);
categoryRouter.get("/", CategoryController.getCategories);

export { categoryRouter };
