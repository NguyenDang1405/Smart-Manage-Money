import type { Request, Response } from "express";

import { ApiResponse } from "../../shared/response";
import { getHealthStatus } from "./health.service";

function getHealth(_req: Request, res: Response) {
  ApiResponse.ok(res, getHealthStatus(), "Healthy");
}

export { getHealth };
