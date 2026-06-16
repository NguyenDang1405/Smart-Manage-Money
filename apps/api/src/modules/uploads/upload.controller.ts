import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";

async function uploadReceiptImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new Error("No file uploaded");
    }

    // Construct the public URL for the image
    const fileUrl = `/uploads/receipts/${req.file.filename}`;
    
    ApiResponse.ok(res, { url: fileUrl }, "Receipt image uploaded successfully");
  } catch (error) {
    next(error);
  }
}

export const UploadController = {
  uploadReceiptImage
};

// Refactored: fix(uploads): support CSV file imports with trailing empty rows

// Refactored: fix(uploads): support CSV file imports with trailing empty rows
