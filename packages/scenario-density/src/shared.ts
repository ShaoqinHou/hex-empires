import type { RandomSource } from "@hex-empires/kernel";

import type {
  DensityCommand,
  DensityProfile,
  DensitySnapshotEntity,
  DensityWorkload,
} from "./contracts.js";
import { validateDensityWorkload } from "./contracts.js";

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
