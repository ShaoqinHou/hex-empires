import type {
  DensityGridPreparation,
  DensityNeighborSearchDiagnostics,
  DensityOperations,
  DensitySnapshotEntity,
} from "./contracts.js";
import type { DensityScenario, DensityVariant } from "./contracts.js";
import {
  createDensityGridWorkspace,
  densityGridCellIndex,
  densityNeighborDiagnostics,
  densityPairFingerprintSumValue,
  densityPairFingerprintXorValue,
  prefixDensityGrid,
  type DensityGridWorkspace,
} from "./neighbor-grid.js";
import {
  areNeighbors,
  assertChurnFulfilled,
  compareSnapshotEntities,
  DENSITY_V2_POSITION_STREAM,
  DENSITY_V2_VELOCITY_STREAM,
  type DensityConfiguration,
  initialActiveMask,
  isDensityWorkloadV2,
  profileUsesChurn,
  profileUsesNeighborhood,
  randomValues,
  validateConfiguration,
  v2InitialValues,
  wrapCoordinate,
} from "./shared.js";

export interface SoaDensityWorld {
  configuration: DensityConfiguration | undefined;
  active: Uint8Array;
  x: Int32Array;
  y: Int32Array;
  velocityX: Int32Array;
  velocityY: Int32Array;
  age: Uint32Array;
  completedTicks: number;
  neighborPairs: number;
}

const soaGridWorkspaces = new WeakMap<SoaDensityWorld, DensityGridWorkspace>();
const soaAllPairsScratch = new WeakMap<SoaDensityWorld, {
  readonly activeIds: Uint32Array;
  readonly preparation: { readonly particleCapacity: number };
}>();

function prepareSoaAllPairs(world: SoaDensityWorld) {
  let workspace = soaAllPairsScratch.get(world);
  if (workspace === undefined) {
    const activeIds = new Uint32Array(world.active.length);
    workspace = { activeIds, preparation: { particleCapacity: activeIds.length } };
    soaAllPairsScratch.set(world, workspace);
  }
  return workspace;
}

function prepareSoaUniformGrid(world: SoaDensityWorld): DensityGridPreparation {
  const configuration = world.configuration;
  if (configuration === undefined) throw new Error("density world is not configured");
  let workspace = soaGridWorkspaces.get(world);
  if (workspace === undefined) {
    workspace = createDensityGridWorkspace(configuration.workload, world.active.length);
    soaGridWorkspaces.set(world, workspace);
  }
  return workspace.preparation;
}

function soaGridWorkspace(world: SoaDensityWorld): DensityGridWorkspace {
  prepareSoaUniformGrid(world);
  return soaGridWorkspaces.get(world)!;
}

function diagnoseSoaAllPairs(world: SoaDensityWorld): DensityNeighborSearchDiagnostics {
  const configuration = world.configuration;
  if (configuration === undefined) throw new Error("density world is not configured");
  const { activeIds } = prepareSoaAllPairs(world);
  let activeCount = 0;
  for (let id = 0; id < world.active.length; id += 1) {
    if (world.active[id] === 1) activeIds[activeCount++] = id;
  }
  let acceptedPairs = 0;
  let fingerprintXor = 0;
  let fingerprintSum = 0;
  const candidateVisits = (activeCount * (activeCount - 1)) / 2;
  for (let leftSlot = 0; leftSlot < activeCount; leftSlot += 1) {
    const leftId = activeIds[leftSlot] ?? 0;
    for (let rightSlot = leftSlot + 1; rightSlot < activeCount; rightSlot += 1) {
      const rightId = activeIds[rightSlot] ?? 0;
      if (!areNeighbors(
        world.x[leftId] ?? 0,
        world.y[leftId] ?? 0,
        world.x[rightId] ?? 0,
        world.y[rightId] ?? 0,
        configuration.workload.neighborRadius,
      )) continue;
      acceptedPairs += 1;
      fingerprintXor = (fingerprintXor ^ densityPairFingerprintXorValue(leftId, rightId)) >>> 0;
      fingerprintSum = (fingerprintSum + densityPairFingerprintSumValue(leftId, rightId)) >>> 0;
    }
  }
  world.neighborPairs = acceptedPairs;
  return densityNeighborDiagnostics({
    algorithm: "brute-force",
    activeCount,
    addressableCells: 0,
    occupiedCells: 0,
    maximumOccupancy: 0,
    slotVisits: world.active.length,
    cellVisits: 0,
    stencilVisits: 0,
    candidateVisits,
    distanceChecks: candidateVisits,
    acceptedPairs,
    pairFingerprintXor: fingerprintXor,
    pairFingerprintSum: fingerprintSum,
  });
}

function diagnoseSoaUniformGrid(world: SoaDensityWorld): DensityNeighborSearchDiagnostics {
  const configuration = world.configuration;
  if (configuration === undefined) throw new Error("density world is not configured");
  const { geometry, scratch } = soaGridWorkspace(world);
  scratch.counts.fill(0);
  let activeCount = 0;
  for (let id = 0; id < world.active.length; id += 1) {
    if (world.active[id] !== 1) continue;
    scratch.counts[densityGridCellIndex(world.x[id] ?? 0, world.y[id] ?? 0, geometry)]! += 1;
    activeCount += 1;
  }
  const occupancy = prefixDensityGrid(scratch);
  for (let id = 0; id < world.active.length; id += 1) {
    if (world.active[id] !== 1) continue;
    const cell = densityGridCellIndex(world.x[id] ?? 0, world.y[id] ?? 0, geometry);
    scratch.particleIds[scratch.cursors[cell]!] = id;
    scratch.cursors[cell]! += 1;
  }

  let cellVisits = geometry.addressableCells * 3;
  let stencilVisits = 0;
  let candidateVisits = 0;
  let distanceChecks = 0;
  let acceptedPairs = 0;
  let fingerprintXor = 0;
  let fingerprintSum = 0;
  for (let sourceCell = 0; sourceCell < geometry.addressableCells; sourceCell += 1) {
    const sourceX = sourceCell % geometry.cellsPerAxis;
    const sourceY = Math.floor(sourceCell / geometry.cellsPerAxis);
    for (let sourceSlot = scratch.offsets[sourceCell]!; sourceSlot < scratch.offsets[sourceCell + 1]!; sourceSlot += 1) {
      const leftId = scratch.particleIds[sourceSlot] ?? 0;
      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          stencilVisits += 1;
          const targetX = sourceX + deltaX;
          const targetY = sourceY + deltaY;
          if (targetX < 0 || targetY < 0 || targetX >= geometry.cellsPerAxis || targetY >= geometry.cellsPerAxis) continue;
          cellVisits += 1;
          const targetCell = targetY * geometry.cellsPerAxis + targetX;
          for (let targetSlot = scratch.offsets[targetCell]!; targetSlot < scratch.offsets[targetCell + 1]!; targetSlot += 1) {
            candidateVisits += 1;
            const rightId = scratch.particleIds[targetSlot] ?? 0;
            if (rightId <= leftId) continue;
            distanceChecks += 1;
            if (!areNeighbors(
              world.x[leftId] ?? 0,
              world.y[leftId] ?? 0,
              world.x[rightId] ?? 0,
              world.y[rightId] ?? 0,
              configuration.workload.neighborRadius,
            )) continue;
            acceptedPairs += 1;
            fingerprintXor = (fingerprintXor ^ densityPairFingerprintXorValue(leftId, rightId)) >>> 0;
            fingerprintSum = (fingerprintSum + densityPairFingerprintSumValue(leftId, rightId)) >>> 0;
          }
        }
      }
    }
  }
  world.neighborPairs = acceptedPairs;
  return densityNeighborDiagnostics({
    algorithm: "uniform-grid",
    activeCount,
    addressableCells: geometry.addressableCells,
    occupiedCells: occupancy.occupiedCells,
    maximumOccupancy: occupancy.maximumOccupancy,
    slotVisits: world.active.length * 2,
    cellVisits,
    stencilVisits,
    candidateVisits,
    distanceChecks,
    acceptedPairs,
    pairFingerprintXor: fingerprintXor,
    pairFingerprintSum: fingerprintSum,
  });
}

export const soaDensityOperations: DensityOperations<SoaDensityWorld> = {
  churn(world, random) {
    const configuration = world.configuration;
    if (configuration === undefined) throw new Error("density world is not configured");
    let remainingDespawns = configuration.workload.churn.despawnPerTick;
    for (let id = 0; id < world.active.length && remainingDespawns > 0; id += 1) {
      if (world.active[id] !== 1) continue;
      world.active[id] = 0;
      remainingDespawns -= 1;
    }
    let remainingSpawns = configuration.workload.churn.spawnPerTick;
    for (let id = 0; id < world.active.length && remainingSpawns > 0; id += 1) {
      if (world.active[id] !== 0) continue;
      const values = randomValues(random, configuration.workload.coordinateLimit);
      world.active[id] = 1;
      world.x[id] = values.x;
      world.y[id] = values.y;
      world.velocityX[id] = values.velocityX;
      world.velocityY[id] = values.velocityY;
      world.age[id] = 0;
      remainingSpawns -= 1;
    }
    return {
      despawned: configuration.workload.churn.despawnPerTick - remainingDespawns,
      spawned: configuration.workload.churn.spawnPerTick - remainingSpawns,
    };
  },
  update(world) {
    const configuration = world.configuration;
    if (configuration === undefined) throw new Error("density world is not configured");
    const limit = configuration.workload.coordinateLimit;
    for (let id = 0; id < world.active.length; id += 1) {
      if (world.active[id] !== 1) continue;
      world.x[id] = wrapCoordinate((world.x[id] ?? 0) + (world.velocityX[id] ?? 0), limit);
      world.y[id] = wrapCoordinate((world.y[id] ?? 0) + (world.velocityY[id] ?? 0), limit);
      world.age[id] = (world.age[id] ?? 0) + 1;
    }
    world.completedTicks += 1;
  },
  countNeighborPairsAllPairs(world) {
    const configuration = world.configuration;
    if (configuration === undefined) throw new Error("density world is not configured");
    let pairs = 0;
    for (let left = 0; left < world.active.length; left += 1) {
      if (world.active[left] !== 1) continue;
      for (let right = left + 1; right < world.active.length; right += 1) {
        if (
          world.active[right] === 1 &&
          areNeighbors(
            world.x[left] ?? 0,
            world.y[left] ?? 0,
            world.x[right] ?? 0,
            world.y[right] ?? 0,
            configuration.workload.neighborRadius,
          )
        ) {
          pairs += 1;
        }
      }
    }
    world.neighborPairs = pairs;
    return pairs;
  },
  prepareNeighborPairsAllPairs(world) {
    return prepareSoaAllPairs(world).preparation;
  },
  diagnoseNeighborPairsAllPairs: diagnoseSoaAllPairs,
  prepareNeighborPairsUniformGrid: prepareSoaUniformGrid,
  diagnoseNeighborPairsUniformGrid: diagnoseSoaUniformGrid,
  materializeSnapshot(world) {
    const configuration = world.configuration;
    if (configuration === undefined) throw new Error("density world is not configured");
    const entities: DensitySnapshotEntity[] = [];
    for (let id = 0; id < world.active.length; id += 1) {
      if (world.active[id] !== 1) continue;
      entities.push({
        id,
        x: world.x[id] ?? 0,
        y: world.y[id] ?? 0,
        velocityX: world.velocityX[id] ?? 0,
        velocityY: world.velocityY[id] ?? 0,
        age: world.age[id] ?? 0,
      });
    }
    entities.sort(compareSnapshotEntities);
    return {
      workloadId: configuration.workload.id,
      profile: configuration.profile,
      completedTicks: world.completedTicks,
      activeCount: entities.length,
      neighborPairs: world.neighborPairs,
      entities,
    };
  },
};

export const soaDensityScenario: DensityScenario<SoaDensityWorld> = {
  id: "density-soa",
  schemaVersion: 1,
  createWorld() {
    return {
      configuration: undefined,
      active: new Uint8Array(0),
      x: new Int32Array(0),
      y: new Int32Array(0),
      velocityX: new Int32Array(0),
      velocityY: new Int32Array(0),
      age: new Uint32Array(0),
      completedTicks: 0,
      neighborPairs: 0,
    };
  },
  validateCommand(world, command, context) {
    validateConfiguration(world.configuration !== undefined, command, context.tick, context.sequence);
  },
  applyCommand(world, command, context) {
    const workload = command.workload;
    world.configuration = { workload, profile: command.profile };
    world.active = new Uint8Array(workload.capacity);
    world.x = new Int32Array(workload.capacity);
    world.y = new Int32Array(workload.capacity);
    world.velocityX = new Int32Array(workload.capacity);
    world.velocityY = new Int32Array(workload.capacity);
    world.age = new Uint32Array(workload.capacity);
    const active = initialActiveMask(workload);
    const legacyRandom = isDensityWorkloadV2(workload)
      ? undefined
      : context.random.stream("density-initial");
    const positionRandom = isDensityWorkloadV2(workload)
      ? context.random.stream(DENSITY_V2_POSITION_STREAM)
      : undefined;
    const velocityRandom = isDensityWorkloadV2(workload)
      ? context.random.stream(DENSITY_V2_VELOCITY_STREAM)
      : undefined;
    let activeOrdinal = 0;
    for (let id = 0; id < workload.capacity; id += 1) {
      if (active[id] !== 1) continue;
      const values = isDensityWorkloadV2(workload)
        ? v2InitialValues(
            positionRandom!,
            velocityRandom!,
            workload.coordinateLimit,
            workload.initialization,
            activeOrdinal,
          )
        : randomValues(legacyRandom!, workload.coordinateLimit);
      world.active[id] = 1;
      world.x[id] = values.x;
      world.y[id] = values.y;
      world.velocityX[id] = values.velocityX;
      world.velocityY[id] = values.velocityY;
      activeOrdinal += 1;
    }
  },
  systems: [
    {
      name: "apply-churn",
      run(world, context) {
        const configuration = world.configuration;
        if (configuration === undefined || context.tick === 0 || !profileUsesChurn(configuration.profile)) return;
        const result = soaDensityOperations.churn(world, context.random.stream("density-churn"));
        assertChurnFulfilled(
          configuration.profile,
          context.tick,
          configuration.workload.churn.despawnPerTick,
          configuration.workload.churn.spawnPerTick,
          result.despawned,
          result.spawned,
        );
      },
    },
    {
      name: "integrate",
      run(world, context) {
        const configuration = world.configuration;
        if (configuration === undefined || context.tick === 0) return;
        soaDensityOperations.update(world);
      },
    },
    {
      name: "count-neighbor-pairs-all-pairs",
      run(world, context) {
        const configuration = world.configuration;
        if (configuration === undefined || context.tick === 0 || !profileUsesNeighborhood(configuration.profile)) {
          world.neighborPairs = 0;
          return;
        }
        soaDensityOperations.countNeighborPairsAllPairs(world);
      },
    },
  ],
  snapshot(world) {
    return soaDensityOperations.materializeSnapshot(world);
  },
};

export const soaDensityVariant: DensityVariant<SoaDensityWorld> = {
  id: "soa",
  storage: "soa",
  scenario: soaDensityScenario,
  operations: soaDensityOperations,
};
