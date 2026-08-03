import type { DensityOperations, DensitySnapshotEntity } from "./contracts.js";
import type { DensityScenario, DensityVariant } from "./contracts.js";
import {
  areNeighbors,
  assertChurnFulfilled,
  compareSnapshotEntities,
  DENSITY_V2_POSITION_STREAM,
  DENSITY_V2_VELOCITY_STREAM,
  type DensityConfiguration,
  type InitialValues,
  initialActiveMask,
  isDensityWorkloadV2,
  profileUsesChurn,
  profileUsesNeighborhood,
  randomValues,
  validateConfiguration,
  v2InitialValues,
  wrapCoordinate,
} from "./shared.js";

interface ObjectEntity {
  readonly id: number;
  active: boolean;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  age: number;
}

export interface ObjectDensityWorld {
  configuration: DensityConfiguration | undefined;
  readonly entities: ObjectEntity[];
  completedTicks: number;
  neighborPairs: number;
}

export const objectDensityOperations: DensityOperations<ObjectDensityWorld> = {
  churn(world, random) {
    const configuration = world.configuration;
    if (configuration === undefined) throw new Error("density world is not configured");
    let remainingDespawns = configuration.workload.churn.despawnPerTick;
    for (const entity of world.entities) {
      if (remainingDespawns === 0) break;
      if (!entity.active) continue;
      entity.active = false;
      remainingDespawns -= 1;
    }
    let remainingSpawns = configuration.workload.churn.spawnPerTick;
    for (const entity of world.entities) {
      if (remainingSpawns === 0) break;
      if (entity.active) continue;
      const values = randomValues(random, configuration.workload.coordinateLimit);
      entity.active = true;
      entity.x = values.x;
      entity.y = values.y;
      entity.velocityX = values.velocityX;
      entity.velocityY = values.velocityY;
      entity.age = 0;
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
    for (const entity of world.entities) {
      if (!entity.active) continue;
      entity.x = wrapCoordinate(entity.x + entity.velocityX, limit);
      entity.y = wrapCoordinate(entity.y + entity.velocityY, limit);
      entity.age += 1;
    }
    world.completedTicks += 1;
  },
  countNeighborPairsAllPairs(world) {
    const configuration = world.configuration;
    if (configuration === undefined) throw new Error("density world is not configured");
    let pairs = 0;
    for (let leftIndex = 0; leftIndex < world.entities.length; leftIndex += 1) {
      const left = world.entities[leftIndex];
      if (left === undefined || !left.active) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < world.entities.length; rightIndex += 1) {
        const right = world.entities[rightIndex];
        if (
          right !== undefined &&
          right.active &&
          areNeighbors(left.x, left.y, right.x, right.y, configuration.workload.neighborRadius)
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
    const entities: DensitySnapshotEntity[] = world.entities
      .filter((entity) => entity.active)
      .map((entity) => ({
        id: entity.id,
        x: entity.x,
        y: entity.y,
        velocityX: entity.velocityX,
        velocityY: entity.velocityY,
        age: entity.age,
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

export const objectDensityScenario: DensityScenario<ObjectDensityWorld> = {
  id: "density-object",
  schemaVersion: 1,
  createWorld() {
    return { configuration: undefined, entities: [], completedTicks: 0, neighborPairs: 0 };
  },
  validateCommand(world, command, context) {
    validateConfiguration(world.configuration !== undefined, command, context.tick, context.sequence);
  },
  applyCommand(world, command, context) {
    const workload = command.workload;
    world.configuration = { workload, profile: command.profile };
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
      let values: InitialValues | undefined;
      if (active[id] === 1) {
        values = isDensityWorkloadV2(workload)
          ? v2InitialValues(
              positionRandom!,
              velocityRandom!,
              workload.coordinateLimit,
              workload.initialization,
              activeOrdinal,
            )
          : randomValues(legacyRandom!, workload.coordinateLimit);
        activeOrdinal += 1;
      }
      world.entities.push({
        id,
        active: values !== undefined,
        x: values?.x ?? 0,
        y: values?.y ?? 0,
        velocityX: values?.velocityX ?? 0,
        velocityY: values?.velocityY ?? 0,
        age: 0,
      });
    }
  },
  systems: [
    {
      name: "apply-churn",
      run(world, context) {
        const configuration = world.configuration;
        if (configuration === undefined || context.tick === 0 || !profileUsesChurn(configuration.profile)) return;
        const result = objectDensityOperations.churn(world, context.random.stream("density-churn"));
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
        objectDensityOperations.update(world);
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
        objectDensityOperations.countNeighborPairsAllPairs(world);
      },
    },
  ],
  snapshot(world) {
    return objectDensityOperations.materializeSnapshot(world);
  },
};

export const objectDensityVariant: DensityVariant<ObjectDensityWorld> = {
  id: "object",
  storage: "object",
  scenario: objectDensityScenario,
  operations: objectDensityOperations,
};
