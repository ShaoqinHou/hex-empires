import { NamedRandomStreams } from "@hex-empires/kernel";
import { describe, expect, it } from "vitest";

import type {
  DensityGridPreparation,
  DensityNeighborSearchDiagnostics,
  DensityOperations,
  DensityScenario,
  DensityWorkloadV2,
} from "./contracts.js";
import {
  DENSITY_WORKLOAD_FORMAT_V2,
  densityV2InitializationFixtures,
} from "./index.js";
import {
  hybridDensityOperations,
  hybridDensityScenario,
  type HybridDensityWorld,
} from "./hybrid.js";
import {
  MAX_DENSITY_GRID_CELLS,
} from "./neighbor-grid.js";
import {
  objectDensityOperations,
  objectDensityScenario,
  type ObjectDensityWorld,
} from "./object.js";
import {
  soaDensityOperations,
  soaDensityScenario,
  type SoaDensityWorld,
} from "./soa.js";

function fixture(
  id: string,
  capacity: number,
  coordinateLimit: number,
  neighborRadius: number,
): DensityWorkloadV2 {
  return {
    format: DENSITY_WORKLOAD_FORMAT_V2,
    id,
    seed: `${id}-seed`,
    capacity,
    initialActive: capacity,
    coordinateLimit,
    neighborRadius,
    churn: { despawnPerTick: 0, spawnPerTick: 0 },
    ticks: {
      update: 1,
      "neighborhood-all-pairs": 1,
      churn: 1,
      snapshot: 1,
      replay: 1,
    },
    initialization: { activeSlots: "packed-prefix", positions: "coincident" },
  };
}

function configure<World>(scenario: DensityScenario<World>, workload: DensityWorkloadV2): World {
  const random = new NamedRandomStreams(workload.seed);
  const world = scenario.createWorld({ runSeed: workload.seed, random });
  const command = { kind: "configure", profile: "neighborhood-all-pairs", workload } as const;
  const context = { tick: 0, sequence: 0, random } as const;
  scenario.validateCommand(world, command, context);
  return scenario.applyCommand(world, command, context) ?? world;
}

interface NeighborAdapter {
  readonly id: string;
  create(workload: DensityWorkloadV2): unknown;
  setPosition(world: unknown, id: number, x: number, y: number): void;
  prepareBrute(world: unknown): { readonly particleCapacity: number };
  brute(world: unknown): DensityNeighborSearchDiagnostics;
  prepare(world: unknown): DensityGridPreparation;
  grid(world: unknown): DensityNeighborSearchDiagnostics;
}

function adapter<World>(
  id: string,
  scenario: DensityScenario<World>,
  operations: DensityOperations<World>,
  setPosition: (world: World, id: number, x: number, y: number) => void,
): NeighborAdapter {
  return {
    id,
    create: (workload) => configure(scenario, workload),
    setPosition: (world, entityId, x, y) => setPosition(world as World, entityId, x, y),
    prepareBrute: (world) => operations.prepareNeighborPairsAllPairs(world as World),
    brute: (world) => operations.diagnoseNeighborPairsAllPairs(world as World),
    prepare: (world) => operations.prepareNeighborPairsUniformGrid(world as World),
    grid: (world) => operations.diagnoseNeighborPairsUniformGrid(world as World),
  };
}

const adapters: readonly NeighborAdapter[] = [
  adapter<ObjectDensityWorld>("object", objectDensityScenario, objectDensityOperations, (world, id, x, y) => {
    world.entities[id]!.x = x;
    world.entities[id]!.y = y;
  }),
  adapter<SoaDensityWorld>("soa", soaDensityScenario, soaDensityOperations, (world, id, x, y) => {
    world.x[id] = x;
    world.y[id] = y;
  }),
  adapter<HybridDensityWorld>("hybrid", hybridDensityScenario, hybridDensityOperations, (world, id, x, y) => {
    world.x[id] = x;
    world.y[id] = y;
  }),
];

function expectParity(
  adapterUnderTest: NeighborAdapter,
  world: unknown,
): readonly [DensityNeighborSearchDiagnostics, DensityNeighborSearchDiagnostics] {
  const brute = adapterUnderTest.brute(world);
  const grid = adapterUnderTest.grid(world);
  expect(grid.acceptedPairs).toBe(brute.acceptedPairs);
  expect(grid.pairFingerprintXor).toBe(brute.pairFingerprintXor);
  expect(grid.pairFingerprintSum).toBe(brute.pairFingerprintSum);
  return [brute, grid];
}

describe("density uniform-grid neighbor search", () => {
  it.each(adapters)("matches brute force across every initialization factor in $id storage", (adapterUnderTest) => {
    for (const workload of densityV2InitializationFixtures) {
      expectParity(adapterUnderTest, adapterUnderTest.create(workload));
    }
  });

  it.each(adapters)("handles radius zero without duplicate pairs in $id storage", (adapterUnderTest) => {
    const workload = fixture(`grid-radius-zero-${adapterUnderTest.id}`, 3, 4, 0);
    const world = adapterUnderTest.create(workload);
    [[0, 0], [0, 0], [1, 0]].forEach(([x, y], id) => adapterUnderTest.setPosition(world, id, x!, y!));
    const [brute, grid] = expectParity(adapterUnderTest, world);
    expect(brute.distanceChecks).toBe(3);
    expect(grid.acceptedPairs).toBe(1);
    expect(grid.maximumOccupancy).toBe(2);
    expect(grid.stencilVisits).toBe(27);
  });

  it.each(adapters)("covers exact cutoffs, negative cell boundaries, adjacent cells, and direct edges in $id storage", (adapterUnderTest) => {
    const workload = fixture(`grid-boundaries-${adapterUnderTest.id}`, 7, 4, 2);
    const world = adapterUnderTest.create(workload);
    const positions = [
      [-4, -4],
      [-2, -4],
      [4, 4],
      [3, 4],
      [0, 0],
      [0, 2],
      [1, 1],
    ] as const;
    positions.forEach(([x, y], id) => adapterUnderTest.setPosition(world, id, x, y));
    const [brute, grid] = expectParity(adapterUnderTest, world);
    expect(brute.acceptedPairs).toBe(5);
    expect(brute.distanceChecks).toBe(21);
    expect(grid.distanceChecks).toBeLessThan(brute.distanceChecks);
  });

  it.each(adapters)("returns identical diagnostics on repeated $id invocations", (adapterUnderTest) => {
    const world = adapterUnderTest.create(fixture(`grid-repeat-${adapterUnderTest.id}`, 12, 8, 3));
    const brutePreparation = adapterUnderTest.prepareBrute(world);
    expect(adapterUnderTest.prepareBrute(world)).toBe(brutePreparation);
    const preparation = adapterUnderTest.prepare(world);
    expect(adapterUnderTest.prepare(world)).toBe(preparation);
    expect(adapterUnderTest.brute(world)).toEqual(adapterUnderTest.brute(world));
    expect(adapterUnderTest.grid(world)).toEqual(adapterUnderTest.grid(world));
  });

  it.each(adapters)("reports exact quadratic/output-sensitive coincident work in $id storage", (adapterUnderTest) => {
    for (const activeCount of [32, 64]) {
      const world = adapterUnderTest.create(fixture(`grid-coincident-${adapterUnderTest.id}-${activeCount}`, activeCount, 64, 4));
      const [brute, grid] = expectParity(adapterUnderTest, world);
      const pairs = (activeCount * (activeCount - 1)) / 2;
      expect(brute.candidateVisits).toBe(pairs);
      expect(brute.distanceChecks).toBe(pairs);
      expect(grid.maximumOccupancy).toBe(activeCount);
      expect(grid.candidateVisits).toBe(activeCount * activeCount);
      expect(grid.distanceChecks).toBe(pairs);
      expect(grid.acceptedPairs).toBe(pairs);
    }
  });

  it.each(adapters)("shows linear grid structural growth for a fixed-density lattice in $id storage", (adapterUnderTest) => {
    const diagnostics = [8, 16].map((side) => {
      const coordinateLimit = side * 2 - 1;
      const world = adapterUnderTest.create(
        fixture(`grid-fixed-density-${adapterUnderTest.id}-${side}`, side * side, coordinateLimit, 2),
      );
      let id = 0;
      for (let row = 0; row < side; row += 1) {
        for (let column = 0; column < side; column += 1) {
          adapterUnderTest.setPosition(
            world,
            id,
            -coordinateLimit + 1 + column * 4,
            -coordinateLimit + 1 + row * 4,
          );
          id += 1;
        }
      }
      return adapterUnderTest.grid(world);
    });
    const small = diagnostics[0]!;
    const large = diagnostics[1]!;
    expect(large.activeCount).toBe(small.activeCount * 4);
    expect(large.addressableCells).toBe(small.addressableCells * 4);
    expect(large.totalStructuralWork / small.totalStructuralWork).toBeGreaterThan(3.9);
    expect(large.totalStructuralWork / small.totalStructuralWork).toBeLessThan(4.1);
  });

  it("rejects an impractical dense address space before allocation", () => {
    const workload = fixture("grid-address-space-rejection", 1, 1_000_000, 0);
    const world = configure(soaDensityScenario, workload);
    expect(() => soaDensityOperations.diagnoseNeighborPairsUniformGrid(world)).toThrow(
      `maximum is ${MAX_DENSITY_GRID_CELLS}`,
    );
  });

  it("rejects coordinates outside the pinned workload domain", () => {
    const workload = fixture("grid-out-of-domain", 1, 4, 2);
    const world = configure(soaDensityScenario, workload);
    world.x[0] = 5;
    expect(() => soaDensityOperations.diagnoseNeighborPairsUniformGrid(world)).toThrow(
      "outside the pinned workload domain",
    );
  });
});
