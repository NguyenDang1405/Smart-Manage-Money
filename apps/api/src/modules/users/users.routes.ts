import { Router } from "express";
import { UsersController } from "./users.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { avatarUploadMiddleware } from "../../middleware/upload.middleware";

const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/profile", UsersController.getProfile);
usersRouter.patch("/profile", UsersController.updateProfile);
usersRouter.post("/avatar", avatarUploadMiddleware.single("avatar"), UsersController.uploadAvatar);
usersRouter.patch("/security", UsersController.updateSecurity);
usersRouter.patch("/change-password", UsersController.changePassword);

export { usersRouter };
