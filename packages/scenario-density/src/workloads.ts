import { DENSITY_WORKLOAD_FORMAT, type DensityWorkload } from "./contracts.js";

export const densitySmokeWorkload: DensityWorkload = {
  format: DENSITY_WORKLOAD_FORMAT,
  id: "density-smoke-v1",
  seed: "density-smoke-seed-v1",
  capacity: 24,
  initialActive: 12,
  coordinateLimit: 64,
  neighborRadius: 18,
  churn: {
    despawnPerTick: 3,
    spawnPerTick: 3,
  },
  ticks: {
    update: 5,
    "neighborhood-all-pairs": 3,
    churn: 5,
    snapshot: 4,
    replay: 5,
  },
};

/** Checked-in, non-smoke workload used by the claim-grade benchmark profile. */
export const densityBaselineWorkload: DensityWorkload = {
  format: DENSITY_WORKLOAD_FORMAT,
  id: "density-baseline-v1",
  seed: "density-baseline-seed-v1",
  capacity: 512,
  initialActive: 384,
  coordinateLimit: 4_096,
  neighborRadius: 96,
  churn: {
    despawnPerTick: 32,
    spawnPerTick: 32,
  },
  ticks: {
    update: 240,
    "neighborhood-all-pairs": 16,
    churn: 120,
    snapshot: 12,
    replay: 20,
  },
};
