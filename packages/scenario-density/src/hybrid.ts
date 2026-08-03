import type { DensityOperations, DensitySnapshotEntity } from "./contracts.js";
import type { DensityScenario, DensityVariant } from "./contracts.js";
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

interface HybridEntityMetadata {
  readonly id: number;
  readonly kind: "density-agent";
}

export interface HybridDensityWorld {
  configuration: DensityConfiguration | undefined;
  readonly metadata: HybridEntityMetadata[];
  active: Uint8Array;
  x: Int32Array;
  y: Int32Array;
  velocityX: Int32Array;
  velocityY: Int32Array;
  age: Uint32Array;
  completedTicks: number;
  neighborPairs: number;
}

export const hybridDensityOperations: DensityOperations<HybridDensityWorld> = {
  churn(world, random) {
    const configuration = world.configuration;
    if (configuration === undefined) throw new Error("density world is not configured");
    let remainingDespawns = configuration.workload.churn.despawnPerTick;
    for (const metadata of world.metadata) {
      if (remainingDespawns === 0) break;
      if (world.active[metadata.id] !== 1) continue;
      world.active[metadata.id] = 0;
      remainingDespawns -= 1;
    }
    let remainingSpawns = configuration.workload.churn.spawnPerTick;
    for (const metadata of world.metadata) {
      if (remainingSpawns === 0) break;
      const id = metadata.id;
      if (world.active[id] !== 0) continue;
      const values = randomValues(random, configuration.workload.coordinateLimit);
      world.active[id] = 1;
      world.age[id] = 0;
      world.x[id] = values.x;
      world.y[id] = values.y;
      world.velocityX[id] = values.velocityX;
      world.velocityY[id] = values.velocityY;
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
    for (const metadata of world.metadata) {
      const id = metadata.id;
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
    for (let leftIndex = 0; leftIndex < world.metadata.length; leftIndex += 1) {
      const left = world.metadata[leftIndex];
      if (left === undefined || world.active[left.id] !== 1) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < world.metadata.length; rightIndex += 1) {
        const right = world.metadata[rightIndex];
        if (
          right !== undefined &&
          world.active[right.id] === 1 &&
          areNeighbors(
            world.x[left.id] ?? 0,
            world.y[left.id] ?? 0,
            world.x[right.id] ?? 0,
            world.y[right.id] ?? 0,
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
  materializeSnapshot(world) {
    const configuration = world.configuration;
    if (configuration === undefined) throw new Error("density world is not configured");
    const entities: DensitySnapshotEntity[] = world.metadata
      .filter((metadata) => world.active[metadata.id] === 1)
      .map((metadata) => ({
        id: metadata.id,
        x: world.x[metadata.id] ?? 0,
        y: world.y[metadata.id] ?? 0,
        velocityX: world.velocityX[metadata.id] ?? 0,
        velocityY: world.velocityY[metadata.id] ?? 0,
        age: world.age[metadata.id] ?? 0,
      }))
      .sort(compareSnapshotEntities);
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

export const hybridDensityScenario: DensityScenario<HybridDensityWorld> = {
  id: "density-hybrid",
  schemaVersion: 1,
  createWorld() {
    return {
      configuration: undefined,
      metadata: [],
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
      world.metadata.push({ id, kind: "density-agent" });
      if (active[id] !== 1) continue;
      world.active[id] = 1;
      const values = isDensityWorkloadV2(workload)
        ? v2InitialValues(
            positionRandom!,
            velocityRandom!,
            workload.coordinateLimit,
            workload.initialization,
            activeOrdinal,
          )
        : randomValues(legacyRandom!, workload.coordinateLimit);
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
        const result = hybridDensityOperations.churn(world, context.random.stream("density-churn"));
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
        hybridDensityOperations.update(world);
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
        hybridDensityOperations.countNeighborPairsAllPairs(world);
      },
    },
  ],
  snapshot(world) {
    return hybridDensityOperations.materializeSnapshot(world);
  },
};

export const hybridDensityVariant: DensityVariant<HybridDensityWorld> = {
  id: "hybrid",
  storage: "hybrid",
  scenario: hybridDensityScenario,
  operations: hybridDensityOperations,
};
