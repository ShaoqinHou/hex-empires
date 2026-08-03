import {
  DENSITY_WORKLOAD_FORMAT,
  DENSITY_WORKLOAD_FORMAT_V2,
  type DensityWorkload,
  type DensityWorkloadV2,
} from "./contracts.js";

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

const densityV2FixtureFields = {
  format: DENSITY_WORKLOAD_FORMAT_V2,
  seed: "density-initialization-fixtures-seed-v2",
  capacity: 25,
  initialActive: 9,
  coordinateLimit: 64,
  neighborRadius: 18,
  churn: {
    despawnPerTick: 2,
    spawnPerTick: 2,
  },
  ticks: {
    update: 5,
    "neighborhood-all-pairs": 3,
    churn: 5,
    snapshot: 4,
    replay: 5,
  },
} as const;

export const densityV2PackedUniformFixture: DensityWorkloadV2 = {
  ...densityV2FixtureFields,
  id: "density-v2-packed-prefix-uniform-square",
  initialization: { activeSlots: "packed-prefix", positions: "uniform-square" },
};

export const densityV2PackedClusterFixture: DensityWorkloadV2 = {
  ...densityV2FixtureFields,
  id: "density-v2-packed-prefix-four-cluster",
  initialization: { activeSlots: "packed-prefix", positions: "four-cluster" },
};

export const densityV2SpacedUniformFixture: DensityWorkloadV2 = {
  ...densityV2FixtureFields,
  id: "density-v2-evenly-spaced-uniform-square",
  initialization: { activeSlots: "evenly-spaced", positions: "uniform-square" },
};

export const densityV2SpacedClusterFixture: DensityWorkloadV2 = {
  ...densityV2FixtureFields,
  id: "density-v2-evenly-spaced-four-cluster",
  initialization: { activeSlots: "evenly-spaced", positions: "four-cluster" },
};

/** Small deterministic fixtures for factor validation, not a claim-grade benchmark suite. */
export const densityV2InitializationFixtures: readonly DensityWorkloadV2[] = [
  densityV2PackedUniformFixture,
  densityV2PackedClusterFixture,
  densityV2SpacedUniformFixture,
  densityV2SpacedClusterFixture,
];
