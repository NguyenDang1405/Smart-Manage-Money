import { Router } from "express";
import { UploadController } from "./upload.controller";
import { uploadMiddleware } from "../../middleware/upload.middleware";
import { authenticate } from "../../middleware/auth.middleware";

const uploadRouter = Router();

uploadRouter.use(authenticate);

// Use the middleware .single('file') to handle a single file upload with field name 'file'
uploadRouter.post("/receipt", uploadMiddleware.single("file"), UploadController.uploadReceiptImage);

export { uploadRouter };
