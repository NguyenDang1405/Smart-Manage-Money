import { Router } from "express";

import { getHealth } from "./health.controller";
import { prisma } from "../../shared/prisma";

const healthRouter = Router();

healthRouter.get("/health", getHealth);
healthRouter.get("/debug", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});

export { healthRouter };
