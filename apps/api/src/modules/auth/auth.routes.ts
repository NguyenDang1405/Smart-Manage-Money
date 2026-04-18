import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";

const authRouter = Router();

authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/google-login", AuthController.googleLogin);
authRouter.get("/me", authenticate, AuthController.getMe);

export { authRouter };
