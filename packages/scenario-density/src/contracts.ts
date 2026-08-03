import type { CommandEnvelope, RandomSource, ScenarioDefinition } from "@hex-empires/kernel";

export const DENSITY_WORKLOAD_FORMAT = "simulation-playground/density-workload/v1";
export const DENSITY_WORKLOAD_FORMAT_V2 = "simulation-playground/density-workload/v2";
export const MAX_DENSITY_CAPACITY = 1_000_000;
export const MAX_DENSITY_COORDINATE = 1_000_000;
export const MAX_DENSITY_TICKS = 0xffff_ffff;

export type DensityProfile = "update" | "neighborhood-all-pairs" | "churn" | "snapshot" | "replay";

export type DensityActiveSlots = "packed-prefix" | "evenly-spaced";
export type DensityInitialPositions = "uniform-square" | "four-cluster" | "coincident";

export interface DensityInitialization {
  readonly activeSlots: DensityActiveSlots;
  readonly positions: DensityInitialPositions;
}

interface DensityWorkloadFields {
  readonly id: string;
  readonly seed: string;
  readonly capacity: number;
  readonly initialActive: number;
  readonly coordinateLimit: number;
  readonly neighborRadius: number;
  readonly churn: {
    readonly despawnPerTick: number;
    readonly spawnPerTick: number;
  };
  readonly ticks: Readonly<Record<DensityProfile, number>>;
}

export interface DensityWorkloadV1 extends DensityWorkloadFields {
  readonly format: typeof DENSITY_WORKLOAD_FORMAT;
}

export interface DensityWorkloadV2 extends DensityWorkloadFields {
  readonly format: typeof DENSITY_WORKLOAD_FORMAT_V2;
  readonly initialization: DensityInitialization;
}

/** V1 remains accepted verbatim; V2 adds explicit scenario-owned initialization factors. */
export type DensityWorkload = DensityWorkloadV1 | DensityWorkloadV2;

export type NormalizedDensityWorkload = DensityWorkload & {
  readonly initialization: DensityInitialization;
};

export const LEGACY_DENSITY_INITIALIZATION: DensityInitialization = {
  activeSlots: "packed-prefix",
  positions: "uniform-square",
};

export const DENSITY_ACTIVE_SLOT_FACTORS: readonly DensityActiveSlots[] = [
  "packed-prefix",
  "evenly-spaced",
];

export const DENSITY_POSITION_FACTORS: readonly DensityInitialPositions[] = [
  "uniform-square",
  "four-cluster",
  "coincident",
];

export const DENSITY_INITIALIZATION_MATRIX: readonly DensityInitialization[] =
  DENSITY_ACTIVE_SLOT_FACTORS.flatMap((activeSlots) =>
    DENSITY_POSITION_FACTORS.map((positions) => ({ activeSlots, positions })),
  );

export interface ConfigureDensityCommand {
  readonly kind: "configure";
  readonly profile: DensityProfile;
  readonly workload: DensityWorkload;
}

export type DensityCommand = ConfigureDensityCommand;

export interface DensitySnapshotEntity {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly age: number;
}

export interface DensitySnapshot {
  readonly workloadId: string;
  readonly profile: DensityProfile;
  readonly completedTicks: number;
  readonly activeCount: number;
  readonly neighborPairs: number;
  readonly entities: readonly DensitySnapshotEntity[];
}

export interface DensityReplayFixture {
  readonly runSeed: string;
  readonly tickCount: number;
  readonly commands: readonly CommandEnvelope<DensityCommand>[];
}

export type DensityScenario<World> = ScenarioDefinition<World, DensityCommand, DensitySnapshot>;

export interface DensityVariant<World> {
  readonly id: "object" | "soa" | "hybrid";
  readonly storage: "object" | "soa" | "hybrid";
  readonly scenario: DensityScenario<World>;
  readonly operations: DensityOperations<World>;
}

export interface DensityChurnResult {
  readonly despawned: number;
  readonly spawned: number;
}

export type DensityNeighborSearchAlgorithm = "brute-force" | "uniform-grid";

/**
 * Timer-free structural evidence for one complete neighbor-search pass.
 * Fingerprints summarize accepted unordered entity-id pairs, independently of
 * traversal order. `totalStructuralWork` is the sum of slot, cell, stencil,
 * candidate, and exact-distance visits reported by the pass.
 */
export interface DensityNeighborSearchDiagnostics {
  readonly algorithm: DensityNeighborSearchAlgorithm;
  readonly activeCount: number;
  readonly addressableCells: number;
  readonly occupiedCells: number;
  readonly maximumOccupancy: number;
  readonly slotVisits: number;
  readonly cellVisits: number;
  readonly stencilVisits: number;
  readonly candidateVisits: number;
  readonly distanceChecks: number;
  readonly acceptedPairs: number;
  readonly totalStructuralWork: number;
  readonly pairFingerprintXor: number;
  readonly pairFingerprintSum: number;
}

/** Stable, non-authoritative evidence that a world's reusable CSR buffers exist. */
export interface DensityGridPreparation {
  readonly addressableCells: number;
  readonly cellsPerAxis: number;
  readonly cellWidth: number;
  readonly particleCapacity: number;
}

/** Stable, non-authoritative evidence that the brute oracle's ID scratch exists. */
export interface DensityAllPairsPreparation {
  readonly particleCapacity: number;
}

/** Timer-free, experiment-owned operations used by both scenario systems and the benchmark host. */
export interface DensityOperations<World> {
  update(world: World): void;
  churn(world: World, random: RandomSource): DensityChurnResult;
  countNeighborPairsAllPairs(world: World): number;
  prepareNeighborPairsAllPairs(world: World): DensityAllPairsPreparation;
  diagnoseNeighborPairsAllPairs(world: World): DensityNeighborSearchDiagnostics;
  prepareNeighborPairsUniformGrid(world: World): DensityGridPreparation;
  diagnoseNeighborPairsUniformGrid(world: World): DensityNeighborSearchDiagnostics;
  materializeSnapshot(world: World): DensitySnapshot;
}

export const DENSITY_PROFILES: readonly DensityProfile[] = [
  "update",
  "neighborhood-all-pairs",
  "churn",
  "snapshot",
  "replay",
];

function requireInteger(value: number, label: string, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} must be a safe integer of at least ${minimum}`);
  }
}

function requireIntegerAtMost(value: number, label: string, maximum: number): void {
  if (value > maximum) throw new Error(`${label} must be at most ${maximum}`);
}

export function normalizeDensityWorkload(workload: DensityWorkload): NormalizedDensityWorkload {
  if (workload.format === DENSITY_WORKLOAD_FORMAT_V2) return workload;
  return { ...workload, initialization: LEGACY_DENSITY_INITIALIZATION };
}

export function validateDensityWorkload(workload: DensityWorkload): void {
  if (workload.format !== DENSITY_WORKLOAD_FORMAT && workload.format !== DENSITY_WORKLOAD_FORMAT_V2) {
    throw new Error("unsupported density workload format");
  }
  if (workload.format === DENSITY_WORKLOAD_FORMAT_V2) {
    if (!DENSITY_ACTIVE_SLOT_FACTORS.includes(workload.initialization?.activeSlots)) {
      throw new Error("unsupported density initialization.activeSlots");
    }
    if (!DENSITY_POSITION_FACTORS.includes(workload.initialization?.positions)) {
      throw new Error("unsupported density initialization.positions");
    }
  }
  if (workload.id.length === 0) throw new Error("density workload id must not be empty");
  if (workload.seed.length === 0) throw new Error("density workload seed must not be empty");
  requireInteger(workload.capacity, "capacity", 1);
  requireIntegerAtMost(workload.capacity, "capacity", MAX_DENSITY_CAPACITY);
  requireInteger(workload.initialActive, "initialActive", 1);
  if (workload.initialActive > workload.capacity) throw new Error("initialActive exceeds capacity");
  requireInteger(workload.coordinateLimit, "coordinateLimit", 1);
  requireIntegerAtMost(workload.coordinateLimit, "coordinateLimit", MAX_DENSITY_COORDINATE);
  requireInteger(workload.neighborRadius, "neighborRadius", 0);
  if (workload.neighborRadius > workload.coordinateLimit * 2) {
    throw new Error("neighborRadius exceeds the coordinate diameter");
  }
  requireInteger(workload.churn.despawnPerTick, "churn.despawnPerTick", 0);
  requireInteger(workload.churn.spawnPerTick, "churn.spawnPerTick", 0);
  if (workload.churn.despawnPerTick > workload.initialActive) {
    throw new Error("churn.despawnPerTick exceeds initialActive");
  }
  if (workload.initialActive - workload.churn.despawnPerTick + workload.churn.spawnPerTick > workload.capacity) {
    throw new Error("churn spawn cannot fit after the configured despawns");
  }
  for (const profile of DENSITY_PROFILES) {
    requireInteger(workload.ticks[profile], `ticks.${profile}`, 1);
    requireIntegerAtMost(workload.ticks[profile], `ticks.${profile}`, MAX_DENSITY_TICKS);
  }
  const activeDelta = workload.churn.spawnPerTick - workload.churn.despawnPerTick;
  for (const profile of ["churn", "snapshot", "replay"] as const) {
    const ticks = workload.ticks[profile];
    if (activeDelta < 0) {
      const activeBeforeLastTick = workload.initialActive + (ticks - 1) * activeDelta;
      if (activeBeforeLastTick < workload.churn.despawnPerTick) {
        const firstFailedTick =
          Math.floor(
            (workload.initialActive - workload.churn.despawnPerTick) / -activeDelta,
          ) + 2;
        throw new Error(`${profile} churn cannot fulfill despawns at repeated tick ${firstFailedTick}`);
      }
    }
    const maximumActiveBeforeSpawn = workload.capacity + workload.churn.despawnPerTick - workload.churn.spawnPerTick;
    if (activeDelta > 0) {
      const activeBeforeLastTick = workload.initialActive + (ticks - 1) * activeDelta;
      if (activeBeforeLastTick > maximumActiveBeforeSpawn) {
        const firstFailedTick =
          Math.floor((maximumActiveBeforeSpawn - workload.initialActive) / activeDelta) + 2;
        throw new Error(`${profile} churn cannot fulfill spawns at repeated tick ${firstFailedTick}`);
      }
    }
  }
}

export function densityReplayFixture(workload: DensityWorkload, profile: DensityProfile): DensityReplayFixture {
  validateDensityWorkload(workload);
  return {
    runSeed: workload.seed,
    tickCount: workload.ticks[profile] + 1,
    commands: [{ tick: 0, sequence: 0, command: { kind: "configure", profile, workload } }],
  };
}
