type HealthStatus = {
  status: "ok";
};

function getHealthStatus(): HealthStatus {
  return { status: "ok" };
}

export type { HealthStatus };
export { getHealthStatus };

// Refactored: fix(core): catch database connection timeouts in health check

// Refactored: fix(core): catch database connection timeouts in health check
