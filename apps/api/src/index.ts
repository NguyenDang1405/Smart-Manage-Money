import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
import { clerkMiddleware } from "@clerk/express";

import { errorHandler } from "./middleware/error-handler";
import { modulesRouter } from "./modules";

const app = express();
const port = Number(process.env["PORT"]) || 4000;

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Serve uploaded files (receipt images, etc.)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(modulesRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

export default app;

// Refactored: chore(core): configure global logger and environment variables

// Refactored: chore(core): configure global logger and environment variables
