import { canonicalDigest } from "@hex-empires/kernel";
import {
  DENSITY_WORKLOAD_FORMAT_V2,
  validateDensityWorkload,
  type DensityActiveSlots,
  type DensityInitialPositions,
  type DensityWorkloadV2,
} from "@hex-empires/scenario-density";

import { BENCHMARK_CASE_SPECS, type BenchmarkOperation } from "./report.js";
import {
  MATRIX_BRUTE_NEIGHBOR_ALGORITHM,
  MATRIX_DEFAULT_ALGORITHM_IDS,
  MATRIX_GRID_NEIGHBOR_ALGORITHM,
  getMatrixAlgorithmSpec,
} from "./matrix-algorithms.js";
import {
  MATRIX_SUITE_FORMAT,
  type MatrixClaimClass,
  type MatrixControls,
  type MatrixFactor,
  type MatrixOperationSelection,
  type MatrixPoint,
  type MatrixSuite,
  type MatrixSuiteId,
} from "./matrix-contract.js";

/** Backward-compatible name retained for matrix-v1 consumers. */
export const MATRIX_ALGORITHM_IDS = MATRIX_DEFAULT_ALGORITHM_IDS;

const ALL_OPERATIONS = Object.freeze(Object.keys(BENCHMARK_CASE_SPECS) as BenchmarkOperation[]);
const DEFAULT_TICKS = {
  update: 20,
  "neighborhood-all-pairs": 4,
  churn: 10,
  snapshot: 4,
  replay: 20,
} as const;

interface WorkloadFields {
  readonly capacity: number;
  readonly initialActive: number;
  readonly coordinateLimit: number;
  readonly neighborRadius?: number;
  readonly churn?: number;
  readonly replayTicks?: number;
  readonly activeSlots?: DensityActiveSlots;
  readonly positions?: DensityInitialPositions;
  readonly ticks?: Partial<DensityWorkloadV2["ticks"]>;
}

function workload(fields: WorkloadFields): DensityWorkloadV2 {
  const activeSlots = fields.activeSlots ?? "packed-prefix";
  const positions = fields.positions ?? "uniform-square";
  const churn = fields.churn ?? Math.min(32, fields.initialActive);
  const ticks = {
    ...DEFAULT_TICKS,
    ...fields.ticks,
    replay: fields.replayTicks ?? fields.ticks?.replay ?? DEFAULT_TICKS.replay,
  };
  const identity = [
    `c${fields.capacity}`,
    `a${fields.initialActive}`,
    `b${fields.coordinateLimit}`,
    `r${fields.neighborRadius ?? 96}`,
    `h${churn}`,
    `s${activeSlots === "packed-prefix" ? "p" : "e"}`,
    `p${positions === "uniform-square" ? "u" : positions === "four-cluster" ? "c" : "x"}`,
    `t${ticks.update}-${ticks["neighborhood-all-pairs"]}-${ticks.churn}-${ticks.snapshot}-${ticks.replay}`,
  ].join("-");
  const result: DensityWorkloadV2 = {
    format: DENSITY_WORKLOAD_FORMAT_V2,
    id: `density-matrix-${identity}`,
    seed: "density-scale-matrix-seed-v1",
    capacity: fields.capacity,
    initialActive: fields.initialActive,
    coordinateLimit: fields.coordinateLimit,
    neighborRadius: fields.neighborRadius ?? 96,
    churn: { despawnPerTick: churn, spawnPerTick: churn },
    ticks,
    initialization: { activeSlots, positions },
  };
  validateDensityWorkload(result);
  return result;
}

function selections(operations: readonly BenchmarkOperation[]): readonly MatrixOperationSelection[] {
  return operations.map((operation) => ({ operation, algorithmId: MATRIX_ALGORITHM_IDS[operation] }));
}

function point(
  id: string,
  family: string,
  claimClass: MatrixClaimClass,
  factor: MatrixFactor,
  controls: MatrixControls,
  definition: DensityWorkloadV2,
  operations: readonly BenchmarkOperation[],
): MatrixPoint {
  return {
    id,
    family,
    claimClass,
    factor,
    controls,
    workload: definition,
    workloadDigest: canonicalDigest(definition),
    operations: selections(operations),
  };
}

function spatialPoint(
  id: string,
  family: "spatial-fixed-density" | "spatial-coincident",
  claimClass: "spatial-index" | "spatial-index-steady",
  factor: MatrixFactor,
  controls: MatrixControls,
  definition: DensityWorkloadV2,
): MatrixPoint {
  return {
    id,
    family,
    claimClass,
    factor,
    controls,
    workload: definition,
    workloadDigest: canonicalDigest(definition),
    operations: [
      { operation: "neighbor-pairs", algorithmId: MATRIX_BRUTE_NEIGHBOR_ALGORITHM },
      { operation: "neighbor-pairs", algorithmId: MATRIX_GRID_NEIGHBOR_ALGORITHM },
    ],
  };
}

function spatialIndexPoints(steady: boolean): readonly MatrixPoint[] {
  const sizes = [32, 128, 512, 2_048, 8_192] as const;
  const coordinateLimits = [64, 128, 256, 512, 1_024] as const;
  const passesPerSample = steady ? [64, 16, 4, 1, 1] as const : [1, 1, 1, 1, 1] as const;
  const claimClass = steady ? "spatial-index-steady" as const : "spatial-index" as const;
  const fixedDensity = sizes.map((active, index) => spatialPoint(
    `spatial-fixed-density-${active}`,
    "spatial-fixed-density",
    claimClass,
    { name: "activeParticles", kind: "numeric", value: active, unit: "particles" },
    {
      fixed: {
        densityNumerator: 1,
        densityDenominator: 512,
        neighborRadius: 8,
        cellSizeRatio: 1,
        activeSlots: "packed-prefix",
        positions: "uniform-square",
        churnPerTick: 0,
        semanticScope: "fixed-radius-unordered-neighbor-pairs",
      },
      derived: {
        coordinateLimit: "sqrt(128 * activeParticles)",
        squareArea: "(2 * coordinateLimit + 1)^2, proportional to activeParticles",
        ...(steady ? { passesPerSample: `${passesPerSample[index]} complete neighbor passes` } : {}),
      },
    },
    workload({
      capacity: active,
      initialActive: active,
      coordinateLimit: coordinateLimits[index]!,
      neighborRadius: 8,
      churn: 0,
      ticks: { update: 1, "neighborhood-all-pairs": passesPerSample[index]!, churn: 1, snapshot: 1, replay: 1 },
    }),
  ));
  const coincident = sizes.map((active, index) => spatialPoint(
    `spatial-coincident-${active}`,
    "spatial-coincident",
    claimClass,
    { name: "activeParticles", kind: "numeric", value: active, unit: "particles" },
    {
      fixed: {
        coordinateLimit: 128,
        neighborRadius: 8,
        cellSizeRatio: 1,
        activeSlots: "packed-prefix",
        positions: "coincident",
        churnPerTick: 0,
        semanticScope: "fixed-radius-unordered-neighbor-pairs",
      },
      derived: {
        acceptedPairs: "activeParticles * (activeParticles - 1) / 2",
        ...(steady ? { passesPerSample: `${passesPerSample[index]} complete neighbor passes` } : {}),
      },
    },
    workload({
      capacity: active,
      initialActive: active,
      coordinateLimit: 128,
      neighborRadius: 8,
      churn: 0,
      positions: "coincident",
      ticks: { update: 1, "neighborhood-all-pairs": passesPerSample[index]!, churn: 1, snapshot: 1, replay: 1 },
    }),
  ));
  return [...fixedDensity, ...coincident];
}

function stateScalePoints(): readonly MatrixPoint[] {
  const capacities = [128, 256, 512, 1_024] as const;
  const coordinates = [2_048, 2_896, 4_096, 5_793] as const;
  const churn = [8, 16, 32, 64] as const;
  return capacities.map((capacity, index) => point(
    `state-scale-${capacity}`,
    "state-scale",
    "claim",
    { name: "capacity", kind: "numeric", value: capacity, unit: "slots" },
    {
      fixed: {
        occupancyPercent: 75,
        neighborRadius: 96,
        activeSlots: "packed-prefix",
        positions: "uniform-square",
      },
      derived: {
        initialActive: "capacity * 0.75",
        coordinateLimit: "approximately proportional to sqrt(initialActive) to hold spatial density",
        churnPerTick: "capacity / 16",
      },
    },
    workload({
      capacity,
      initialActive: capacity * 0.75,
      coordinateLimit: coordinates[index]!,
      churn: churn[index]!,
    }),
    ALL_OPERATIONS,
  ));
}

function occupancyPoints(): readonly MatrixPoint[] {
  return [25, 50, 75, 100].map((percent) => point(
    `slot-occupancy-${percent}`,
    "slot-occupancy",
    "claim",
    { name: "occupancy", kind: "numeric", value: percent, unit: "percent" },
    {
      fixed: {
        capacity: 1_024,
        coordinateLimit: 5_793,
        neighborRadius: 96,
        activeSlots: "packed-prefix",
        positions: "uniform-square",
        churnPerTick: 32,
      },
      derived: { initialActive: "capacity * occupancy / 100" },
    },
    workload({ capacity: 1_024, initialActive: 1_024 * percent / 100, coordinateLimit: 5_793, churn: 32 }),
    ["update", "neighborhood-all-pairs"],
  ));
}

function slotPatternPoints(): readonly MatrixPoint[] {
  return (["packed-prefix", "evenly-spaced"] as const).map((activeSlots) => point(
    `slot-pattern-${activeSlots}`,
    "slot-pattern",
    "claim",
    { name: "activeSlots", kind: "categorical", value: activeSlots, unit: "category" },
    {
      fixed: {
        capacity: 1_024,
        initialActive: 256,
        coordinateLimit: 4_096,
        neighborRadius: 96,
        positions: "uniform-square",
        churnPerTick: 32,
      },
      derived: {},
    },
    workload({ capacity: 1_024, initialActive: 256, coordinateLimit: 4_096, churn: 32, activeSlots }),
    ["update", "neighborhood-all-pairs"],
  ));
}

function spatialDensityPoints(): readonly MatrixPoint[] {
  return [2_048, 4_096, 8_192].map((coordinateLimit) => point(
    `spatial-density-${coordinateLimit}`,
    "spatial-density",
    "claim",
    { name: "coordinateLimit", kind: "numeric", value: coordinateLimit, unit: "coordinate-units" },
    {
      fixed: {
        capacity: 512,
        initialActive: 384,
        neighborRadius: 96,
        activeSlots: "packed-prefix",
        positions: "uniform-square",
        churnPerTick: 32,
      },
      derived: {},
    },
    workload({ capacity: 512, initialActive: 384, coordinateLimit, churn: 32 }),
    ["neighborhood-all-pairs"],
  ));
}

function spatialShapePoints(): readonly MatrixPoint[] {
  return (["uniform-square", "four-cluster"] as const).map((positions) => point(
    `spatial-shape-${positions}`,
    "spatial-shape",
    "claim",
    { name: "positions", kind: "categorical", value: positions, unit: "category" },
    {
      fixed: {
        capacity: 512,
        initialActive: 384,
        coordinateLimit: 4_096,
        neighborRadius: 96,
        activeSlots: "packed-prefix",
        churnPerTick: 32,
      },
      derived: {},
    },
    workload({ capacity: 512, initialActive: 384, coordinateLimit: 4_096, churn: 32, positions }),
    ["neighborhood-all-pairs"],
  ));
}

function churnPoints(): readonly MatrixPoint[] {
  return [0, 8, 32, 96].map((churn) => point(
    `churn-intensity-${churn}`,
    "churn-intensity",
    "claim",
    { name: "churnPerTick", kind: "numeric", value: churn, unit: "transitions-each-direction" },
    {
      fixed: {
        capacity: 512,
        initialActive: 384,
        coordinateLimit: 4_096,
        neighborRadius: 96,
        activeSlots: "packed-prefix",
        positions: "uniform-square",
      },
      derived: {},
    },
    workload({ capacity: 512, initialActive: 384, coordinateLimit: 4_096, churn }),
    ["churn"],
  ));
}

function replayPoints(): readonly MatrixPoint[] {
  return [5, 20, 80].map((replayTicks) => point(
    `replay-length-${replayTicks}`,
    "replay-length",
    "claim",
    { name: "replayTicks", kind: "numeric", value: replayTicks, unit: "ticks" },
    {
      fixed: {
        capacity: 512,
        initialActive: 384,
        coordinateLimit: 4_096,
        neighborRadius: 96,
        activeSlots: "packed-prefix",
        positions: "uniform-square",
        churnPerTick: 32,
      },
      derived: {},
    },
    workload({ capacity: 512, initialActive: 384, coordinateLimit: 4_096, churn: 32, replayTicks }),
    ["replay"],
  ));
}

function smokePoints(): readonly MatrixPoint[] {
  return [24, 48].map((capacity) => point(
    `smoke-capacity-${capacity}`,
    "matrix-smoke",
    "smoke",
    { name: "capacity", kind: "numeric", value: capacity, unit: "slots" },
    {
      fixed: {
        occupancyPercent: 50,
        neighborRadius: 18,
        activeSlots: "packed-prefix",
        positions: "uniform-square",
      },
      derived: {
        initialActive: "capacity * 0.5",
        coordinateLimit: "rounded 64 * sqrt(capacity / 24)",
        churnPerTick: "capacity / 12",
      },
    },
    workload({
      capacity,
      initialActive: capacity / 2,
      coordinateLimit: capacity === 24 ? 64 : 91,
      neighborRadius: 18,
      churn: capacity / 12,
      ticks: { update: 2, "neighborhood-all-pairs": 2, churn: 2, snapshot: 2, replay: 2 },
    }),
    ["update", "neighborhood-all-pairs"],
  ));
}

function stressPoints(kind: "stress-linear" | "stress-quadratic"): readonly MatrixPoint[] {
  const capacities = kind === "stress-linear" ? [2_048, 8_192, 32_768] : [2_048, 4_096, 8_192];
  const operation: BenchmarkOperation = kind === "stress-linear" ? "update" : "neighborhood-all-pairs";
  return capacities.map((capacity) => point(
    `${kind}-${capacity}`,
    kind,
    kind,
    { name: "capacity", kind: "numeric", value: capacity, unit: "slots" },
    {
      fixed: {
        occupancyPercent: 75,
        neighborRadius: 96,
        activeSlots: "packed-prefix",
        positions: "uniform-square",
        purpose: "non-claim resource-envelope stress",
      },
      derived: {
        initialActive: "capacity * 0.75",
        coordinateLimit: "round(4096 * sqrt(capacity / 512))",
        churnPerTick: "min(256, capacity / 16)",
      },
    },
    workload({
      capacity,
      initialActive: capacity * 0.75,
      coordinateLimit: Math.round(4_096 * Math.sqrt(capacity / 512)),
      churn: Math.min(256, capacity / 16),
      ticks: kind === "stress-linear"
        ? { update: 50, "neighborhood-all-pairs": 1, churn: 1, snapshot: 1, replay: 1 }
        : { update: 1, "neighborhood-all-pairs": 2, churn: 1, snapshot: 1, replay: 1 },
    }),
    [operation],
  ));
}

export function createMatrixSuite(id: MatrixSuiteId): MatrixSuite {
  const points = id === "smoke"
    ? smokePoints()
    : id === "claim"
      ? [
          ...stateScalePoints(),
          ...occupancyPoints(),
          ...slotPatternPoints(),
          ...spatialDensityPoints(),
          ...spatialShapePoints(),
          ...churnPoints(),
          ...replayPoints(),
        ]
      : id === "spatial-index" || id === "spatial-index-steady"
        ? spatialIndexPoints(id === "spatial-index-steady")
        : stressPoints(id);
  const suite: MatrixSuite = {
    format: MATRIX_SUITE_FORMAT,
    id,
    claimClass: id,
    description: id === "claim"
      ? "Curated one-factor-at-a-time density scale claim suite"
      : id === "smoke"
        ? "Real two-point by two-operation matrix wiring smoke"
        : id === "spatial-index"
          ? "Deterministic brute-force and uniform-grid growth conformance suite"
        : id === "spatial-index-steady"
          ? "Steady-state deterministic brute-force and uniform-grid growth conformance suite"
        : `Non-claim ${id} resource-envelope preset`,
    points,
  };
  validateMatrixSuite(suite);
  return suite;
}

export function validateMatrixSuite(suite: MatrixSuite): void {
  if (suite.format !== MATRIX_SUITE_FORMAT) throw new Error("unsupported matrix suite format");
  if (suite.points.length === 0) throw new Error("matrix suite must contain points");
  const pointIds = new Set<string>();
  for (const pointValue of suite.points) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pointValue.id)) throw new Error(`unsafe matrix point id: ${pointValue.id}`);
    if (pointIds.has(pointValue.id)) throw new Error(`duplicate matrix point: ${pointValue.id}`);
    pointIds.add(pointValue.id);
    validateDensityWorkload(pointValue.workload);
    if (canonicalDigest(pointValue.workload) !== pointValue.workloadDigest) {
      throw new Error(`matrix point workload digest mismatch: ${pointValue.id}`);
    }
    if (pointValue.operations.length === 0) throw new Error(`matrix point has no operations: ${pointValue.id}`);
    const operations = new Set<string>();
    for (const selection of pointValue.operations) {
      getMatrixAlgorithmSpec(selection.operation, selection.algorithmId);
      const key = `${selection.operation}/${selection.algorithmId}`;
      if (operations.has(key)) throw new Error(`duplicate point operation: ${pointValue.id}/${key}`);
      operations.add(key);
    }
  }
  if (suite.id === "smoke") {
    if (suite.points.length !== 2 || suite.points.some((entry) => entry.operations.length !== 2)) {
      throw new Error("matrix smoke must be exactly two points by two operations");
    }
  }
  if (suite.id === "spatial-index" || suite.id === "spatial-index-steady") {
    const fixed = suite.points.filter((entry) => entry.family === "spatial-fixed-density");
    const coincident = suite.points.filter((entry) => entry.family === "spatial-coincident");
    if (fixed.length < 5 || coincident.length < 5 || suite.points.some((entry) => entry.operations.length !== 2)) {
      throw new Error(`${suite.id} suite requires at least five points in each family and both algorithms`);
    }
  }
}
