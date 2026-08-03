import type { RandomSource } from "@hex-empires/kernel";

import type {
  DensityCommand,
  DensityInitialization,
  DensityInitialPositions,
  DensityProfile,
  DensitySnapshotEntity,
  DensityWorkload,
  DensityWorkloadV2,
} from "./contracts.js";
import {
  DENSITY_WORKLOAD_FORMAT_V2,
  normalizeDensityWorkload,
  validateDensityWorkload,
} from "./contracts.js";

export interface DensityConfiguration {
  readonly workload: DensityWorkload;
  readonly profile: DensityProfile;
}

export interface InitialValues {
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
}

export const DENSITY_V2_POSITION_STREAM = "density-initial-v2/positions";
export const DENSITY_V2_VELOCITY_STREAM = "density-initial-v2/velocities";

export function validateConfiguration(
  configured: boolean,
  command: DensityCommand,
  tick: number,
  sequence: number,
): void {
  if (configured) throw new Error("density world is already configured");
  if (command.kind !== "configure") throw new Error("unsupported density command");
  if (tick !== 0 || sequence !== 0) throw new Error("density configuration must be command 0 at tick 0");
  validateDensityWorkload(command.workload);
}

export function profileUsesChurn(profile: DensityProfile): boolean {
  return profile === "churn" || profile === "snapshot" || profile === "replay";
}

export function profileUsesNeighborhood(profile: DensityProfile): boolean {
  return profile === "neighborhood-all-pairs" || profile === "snapshot" || profile === "replay";
}

export function assertChurnFulfilled(
  profile: DensityProfile,
  tick: number,
  expectedDespawns: number,
  expectedSpawns: number,
  actualDespawns: number,
  actualSpawns: number,
): void {
  if (actualDespawns !== expectedDespawns || actualSpawns !== expectedSpawns) {
    throw new Error(
      `${profile} churn at tick ${tick} fulfilled ${actualDespawns}/${expectedDespawns} despawns and ` +
        `${actualSpawns}/${expectedSpawns} spawns`,
    );
  }
}

export function randomValues(random: RandomSource, coordinateLimit: number): InitialValues {
  const coordinateRange = coordinateLimit * 2 + 1;
  return {
    x: random.nextInt(coordinateRange) - coordinateLimit,
    y: random.nextInt(coordinateRange) - coordinateLimit,
    velocityX: random.nextInt(7) - 3,
    velocityY: random.nextInt(7) - 3,
  };
}

/**
 * Produces an exact-size deterministic active mask. Even spacing includes both
 * ends when possible and centers the single-active case.
 */
export function initialActiveMask(workload: DensityWorkload): Uint8Array {
  const initialization = normalizeDensityWorkload(workload).initialization;
  const mask = new Uint8Array(workload.capacity);
  if (initialization.activeSlots === "packed-prefix") {
    mask.fill(1, 0, workload.initialActive);
    return mask;
  }
  if (workload.initialActive === 1) {
    mask[Math.floor((workload.capacity - 1) / 2)] = 1;
    return mask;
  }
  for (let ordinal = 0; ordinal < workload.initialActive; ordinal += 1) {
    const id = Math.floor((ordinal * (workload.capacity - 1)) / (workload.initialActive - 1));
    mask[id] = 1;
  }
  return mask;
}

function initialPosition(
  random: RandomSource,
  coordinateLimit: number,
  positions: DensityInitialPositions,
  activeOrdinal: number,
): Pick<InitialValues, "x" | "y"> {
  if (positions === "uniform-square") {
    const coordinateRange = coordinateLimit * 2 + 1;
    return {
      x: random.nextInt(coordinateRange) - coordinateLimit,
      y: random.nextInt(coordinateRange) - coordinateLimit,
    };
  }

  if (positions === "coincident") return { x: 0, y: 0 };

  const centerOffset = Math.max(1, Math.floor(coordinateLimit / 2));
  const spread = Math.floor(coordinateLimit / 8);
  const offsetRange = spread * 2 + 1;
  const cluster = activeOrdinal % 4;
  const centerX = cluster === 0 || cluster === 2 ? -centerOffset : centerOffset;
  const centerY = cluster < 2 ? -centerOffset : centerOffset;
  return {
    x: centerX + random.nextInt(offsetRange) - spread,
    y: centerY + random.nextInt(offsetRange) - spread,
  };
}

/** V2-only separated streams; callers keep the legacy v1 path byte-for-byte. */
export function v2InitialValues(
  positionRandom: RandomSource,
  velocityRandom: RandomSource,
  coordinateLimit: number,
  initialization: DensityInitialization,
  activeOrdinal: number,
): InitialValues {
  const position = initialPosition(
    positionRandom,
    coordinateLimit,
    initialization.positions,
    activeOrdinal,
  );
  return {
    ...position,
    velocityX: velocityRandom.nextInt(7) - 3,
    velocityY: velocityRandom.nextInt(7) - 3,
  };
}

export function isDensityWorkloadV2(workload: DensityWorkload): workload is DensityWorkloadV2 {
  return workload.format === DENSITY_WORKLOAD_FORMAT_V2;
}

export function wrapCoordinate(value: number, limit: number): number {
  const span = limit * 2 + 1;
  const offset = value + limit;
  return ((offset % span) + span) % span - limit;
}

export function areNeighbors(
  leftX: number,
  leftY: number,
  rightX: number,
  rightY: number,
  radius: number,
): boolean {
  const deltaX = leftX - rightX;
  const deltaY = leftY - rightY;
  return deltaX * deltaX + deltaY * deltaY <= radius * radius;
}

export function compareSnapshotEntities(left: DensitySnapshotEntity, right: DensitySnapshotEntity): number {
  return left.id - right.id;
}
