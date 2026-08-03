import { executeReplay, NamedRandomStreams, Simulation } from "@hex-empires/kernel";
import { describe, expect, it } from "vitest";

import {
  densityReplayFixture,
  densitySmokeWorkload,
  densityV2InitializationFixtures,
  densityV2PackedClusterFixture,
  densityV2PackedUniformFixture,
  densityV2SpacedClusterFixture,
  densityV2SpacedUniformFixture,
  DENSITY_INITIALIZATION_MATRIX,
  DENSITY_WORKLOAD_FORMAT_V2,
  hybridDensityVariant,
  hybridDensityScenario,
  MAX_DENSITY_COORDINATE,
  MAX_DENSITY_TICKS,
  objectDensityScenario,
  objectDensityVariant,
  normalizeDensityWorkload,
  soaDensityScenario,
  soaDensityVariant,
  validateDensityWorkload,
} from "./index.js";
import type { DensityProfile, DensityWorkload } from "./index.js";

const profiles: readonly DensityProfile[] = ["update", "neighborhood-all-pairs", "churn", "snapshot", "replay"];

const legacySmokeDigests: Readonly<Record<DensityProfile, string>> = {
  update: "d314b3bf2b8311fd26815035f4dbe05a6bafae1a724a77489c8b342aa652e8a0",
  "neighborhood-all-pairs": "037d386e9f698526820f019d164e940d32934e7fd92a35bfa7fad787a2e453e7",
  churn: "6c79218dd6a4677a773fae3c90f96528c9722affc6ef4a0772a51652c51cdfca",
  snapshot: "00820a1330cfaaaa8a00b03e5c88efd4986e854af46f6e97837fb2a2de572a57",
  replay: "55cb68766fd6dce25132e9105fa816a787cb8c08db71bf1779accc64b51658c3",
};

const v2ReplayDigests: Readonly<Record<string, string>> = {
  "density-v2-packed-prefix-uniform-square": "1d19d11d9db4ab574490a3d98f4b412e8c9c6916e7a0ee1b3871b17678afc3d3",
  "density-v2-packed-prefix-four-cluster": "e3b263a954657e8bf07ca0ef6c53b4c9f31eba313e84d9042d6bace8728f20f9",
  "density-v2-evenly-spaced-uniform-square": "0892a67dccd57a43646116010d5daa0e1ff77f50da5bf31a4f1da6d2e785bbf3",
  "density-v2-evenly-spaced-four-cluster": "74db0ab2975d74835f1c134b92605aef4dc2ef44cdf0ec7857dcd91704a630ff",
};

describe("density storage variants", () => {
  it.each(profiles)("preserves the v1 %s digest", (profile) => {
    const fixture = densityReplayFixture(densitySmokeWorkload, profile);
    expect(executeReplay({ scenario: objectDensityScenario, ...fixture }).snapshotDigest).toBe(
      legacySmokeDigests[profile],
    );
  });

  it("use concrete object, SoA, and hybrid layouts", () => {
    const objectWorld = objectDensityScenario.createWorld({
      runSeed: densitySmokeWorkload.seed,
      random: { stream: () => { throw new Error("not used during construction"); } },
    });
    const soaWorld = soaDensityScenario.createWorld({
      runSeed: densitySmokeWorkload.seed,
      random: { stream: () => { throw new Error("not used during construction"); } },
    });
    const hybridWorld = hybridDensityScenario.createWorld({
      runSeed: densitySmokeWorkload.seed,
      random: { stream: () => { throw new Error("not used during construction"); } },
    });

    expect(objectWorld.entities).toEqual([]);
    expect(soaWorld.active).toBeInstanceOf(Uint8Array);
    expect(hybridWorld.metadata).toEqual([]);
    expect(hybridWorld.active).toBeInstanceOf(Uint8Array);
    expect(hybridWorld.x).toBeInstanceOf(Int32Array);
    expect(hybridWorld.age).toBeInstanceOf(Uint32Array);
  });

  it.each(profiles)("produces identical canonical semantics for the %s profile", (profile) => {
    const fixture = densityReplayFixture(densitySmokeWorkload, profile);
    const objectEvidence = executeReplay({ scenario: objectDensityScenario, ...fixture });
    const soaEvidence = executeReplay({ scenario: soaDensityScenario, ...fixture });
    const hybridEvidence = executeReplay({ scenario: hybridDensityScenario, ...fixture });

    expect(soaEvidence.snapshot).toEqual(objectEvidence.snapshot);
    expect(hybridEvidence.snapshot).toEqual(objectEvidence.snapshot);
    expect(soaEvidence.snapshotDigest).toBe(objectEvidence.snapshotDigest);
    expect(hybridEvidence.snapshotDigest).toBe(objectEvidence.snapshotDigest);
    expect(executeReplay({ scenario: objectDensityScenario, ...fixture })).toEqual(objectEvidence);
  });

  it.each(profiles)("preserves cross-layout parity after every tick for the %s profile", (profile) => {
    const fixture = densityReplayFixture(densitySmokeWorkload, profile);
    const simulations = [
      new Simulation(objectDensityScenario, fixture.runSeed),
      new Simulation(soaDensityScenario, fixture.runSeed),
      new Simulation(hybridDensityScenario, fixture.runSeed),
    ];
    for (const simulation of simulations) {
      simulation.enqueueAll(fixture.commands);
    }

    for (let tick = 0; tick < fixture.tickCount; tick += 1) {
      const captures = simulations.map((simulation) => {
        simulation.runTicks(1);
        return simulation.capture();
      });
      expect(captures[1]?.snapshot).toEqual(captures[0]?.snapshot);
      expect(captures[2]?.snapshot).toEqual(captures[0]?.snapshot);
      expect(captures[1]?.snapshotDigest).toBe(captures[0]?.snapshotDigest);
      expect(captures[2]?.snapshotDigest).toBe(captures[0]?.snapshotDigest);
    }
  });

  it.each(densityV2InitializationFixtures)(
    "preserves deterministic cross-layout phase parity for $initialization.activeSlots/$initialization.positions",
    (workload) => {
      const fixture = densityReplayFixture(workload, "replay");
      const simulations = [
        new Simulation(objectDensityScenario, fixture.runSeed),
        new Simulation(soaDensityScenario, fixture.runSeed),
        new Simulation(hybridDensityScenario, fixture.runSeed),
      ];
      for (const simulation of simulations) simulation.enqueueAll(fixture.commands);

      const objectCaptures = [];
      for (let tick = 0; tick < fixture.tickCount; tick += 1) {
        const captures = simulations.map((simulation) => {
          simulation.runTicks(1);
          return simulation.capture();
        });
        expect(captures[1]).toEqual(captures[0]);
        expect(captures[2]).toEqual(captures[0]);
        objectCaptures.push(captures[0]);
      }

      const repeated = executeReplay({ scenario: objectDensityScenario, ...fixture });
      expect(repeated).toEqual(executeReplay({ scenario: objectDensityScenario, ...fixture }));
      expect(repeated.snapshot).toEqual(objectCaptures.at(-1)?.snapshot);
      expect(repeated.snapshotDigest).toBe(v2ReplayDigests[workload.id]);
    },
  );

  it.each([
    { capacity: 6, initialActive: 1, expectedIds: [2] },
    { capacity: 5, initialActive: 5, expectedIds: [0, 1, 2, 3, 4] },
  ])("keeps evenly-spaced edge case $initialActive/$capacity exact", ({ capacity, initialActive, expectedIds }) => {
    const workload: DensityWorkload = {
      ...densityV2SpacedUniformFixture,
      id: `density-v2-spaced-edge-${initialActive}-${capacity}`,
      capacity,
      initialActive,
      churn: { despawnPerTick: 0, spawnPerTick: 0 },
    };
    const fixture = { ...densityReplayFixture(workload, "update"), tickCount: 1 };
    for (const snapshot of [
      executeReplay({ scenario: objectDensityScenario, ...fixture }).snapshot,
      executeReplay({ scenario: soaDensityScenario, ...fixture }).snapshot,
      executeReplay({ scenario: hybridDensityScenario, ...fixture }).snapshot,
    ]) {
      expect(snapshot.activeCount).toBe(initialActive);
      expect(snapshot.entities.map((entity) => entity.id)).toEqual(expectedIds);
    }
  });

  it.each(densityV2InitializationFixtures)(
    "selects the exact $initialization.activeSlots slot pattern in every layout",
    (workload) => {
      const fixture = { ...densityReplayFixture(workload, "update"), tickCount: 1 };
      const snapshots = [
        executeReplay({ scenario: objectDensityScenario, ...fixture }).snapshot,
        executeReplay({ scenario: soaDensityScenario, ...fixture }).snapshot,
        executeReplay({ scenario: hybridDensityScenario, ...fixture }).snapshot,
      ];
      const expectedIds = workload.initialization.activeSlots === "packed-prefix"
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8]
        : [0, 3, 6, 9, 12, 15, 18, 21, 24];
      for (const snapshot of snapshots) {
        expect(snapshot.activeCount).toBe(workload.initialActive);
        expect(snapshot.entities.map((entity) => entity.id)).toEqual(expectedIds);
      }
    },
  );

  it.each([
    [densityV2PackedUniformFixture, densityV2PackedClusterFixture],
    [densityV2SpacedUniformFixture, densityV2SpacedClusterFixture],
  ] as const)("keeps velocities independent from the $0.initialization.activeSlots spatial shape", (uniform, clustered) => {
    const uniformSnapshot = executeReplay({
      scenario: objectDensityScenario,
      ...densityReplayFixture(uniform, "update"),
      tickCount: 1,
    }).snapshot;
    const clusteredSnapshot = executeReplay({
      scenario: objectDensityScenario,
      ...densityReplayFixture(clustered, "update"),
      tickCount: 1,
    }).snapshot;

    const motion = (snapshot: typeof uniformSnapshot) =>
      snapshot.entities.map(({ id, velocityX, velocityY }) => ({ id, velocityX, velocityY }));
    const positions = (snapshot: typeof uniformSnapshot) =>
      snapshot.entities.map(({ id, x, y }) => ({ id, x, y }));
    expect(motion(clusteredSnapshot)).toEqual(motion(uniformSnapshot));
    expect(positions(clusteredSnapshot)).not.toEqual(positions(uniformSnapshot));
  });

  it.each([densityV2PackedClusterFixture, densityV2SpacedClusterFixture])(
    "places $initialization.activeSlots entities into four deterministic quadrants",
    (workload) => {
      const snapshot = executeReplay({
        scenario: objectDensityScenario,
        ...densityReplayFixture(workload, "update"),
        tickCount: 1,
      }).snapshot;
      for (const [ordinal, entity] of snapshot.entities.entries()) {
        const cluster = ordinal % 4;
        expect(Math.sign(entity.x)).toBe(cluster === 0 || cluster === 2 ? -1 : 1);
        expect(Math.sign(entity.y)).toBe(cluster < 2 ? -1 : 1);
      }
    },
  );

  it("fulfills every requested churn transition across repeated direct phases", () => {
    for (const variant of [objectDensityVariant, soaDensityVariant, hybridDensityVariant]) {
      const random = new NamedRandomStreams(densitySmokeWorkload.seed);
      const scenario = variant.scenario as typeof objectDensityScenario;
      const operations = variant.operations as typeof objectDensityVariant.operations;
      let world = scenario.createWorld({ runSeed: densitySmokeWorkload.seed, random });
      const command = { kind: "configure", profile: "churn", workload: densitySmokeWorkload } as const;
      const context = { tick: 0, sequence: 0, random } as const;
      scenario.validateCommand(world, command, context);
      world = scenario.applyCommand(world, command, context) ?? world;
      for (let tick = 1; tick <= densitySmokeWorkload.ticks.churn; tick += 1) {
        expect(operations.churn(world, random.stream("density-churn"))).toEqual({
          despawned: densitySmokeWorkload.churn.despawnPerTick,
          spawned: densitySmokeWorkload.churn.spawnPerTick,
        });
      }
    }
  });

  it("keeps the workload and profile in replay-owned command evidence", () => {
    const fixture = densityReplayFixture(densitySmokeWorkload, "replay");
    const evidence = executeReplay({ scenario: objectDensityScenario, ...fixture });

    expect(evidence.commandLog).toEqual([
      {
        tick: 0,
        sequence: 0,
        command: { kind: "configure", profile: "replay", workload: densitySmokeWorkload },
      },
    ]);
    expect(evidence.snapshot).toMatchObject({
      workloadId: densitySmokeWorkload.id,
      profile: "replay",
      completedTicks: densitySmokeWorkload.ticks.replay,
      activeCount: densitySmokeWorkload.initialActive,
    });
    expect(evidence.snapshotDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects configuration outside the first authority command", () => {
    const simulation = new Simulation(objectDensityScenario, densitySmokeWorkload.seed);
    simulation.enqueue({
      tick: 1,
      sequence: 0,
      command: { kind: "configure", profile: "update", workload: densitySmokeWorkload },
    });
    expect(() => simulation.runTicks(2)).toThrow("density configuration must be command 0 at tick 0");
  });

  it("rejects ranges that cannot preserve exact semantics across number and typed-array layouts", () => {
    expect(() =>
      validateDensityWorkload({ ...densitySmokeWorkload, coordinateLimit: MAX_DENSITY_COORDINATE + 1 }),
    ).toThrow("coordinateLimit must be at most");
    expect(() =>
      validateDensityWorkload({
        ...densitySmokeWorkload,
        ticks: { ...densitySmokeWorkload.ticks, replay: MAX_DENSITY_TICKS + 1 },
      }),
    ).toThrow("ticks.replay must be at most");
    expect(() =>
      validateDensityWorkload({
        ...densitySmokeWorkload,
        neighborRadius: densitySmokeWorkload.coordinateLimit * 2 + 1,
      }),
    ).toThrow("neighborRadius exceeds the coordinate diameter");
    expect(() =>
      validateDensityWorkload({
        ...densitySmokeWorkload,
        churn: { despawnPerTick: 3, spawnPerTick: 0 },
      }),
    ).toThrow("churn cannot fulfill despawns at repeated tick");
  });

  it("normalizes v1 and validates explicit v2 initialization factors", () => {
    expect(normalizeDensityWorkload(densitySmokeWorkload).initialization).toEqual({
      activeSlots: "packed-prefix",
      positions: "uniform-square",
    });
    expect(DENSITY_INITIALIZATION_MATRIX).toEqual([
      { activeSlots: "packed-prefix", positions: "uniform-square" },
      { activeSlots: "packed-prefix", positions: "four-cluster" },
      { activeSlots: "evenly-spaced", positions: "uniform-square" },
      { activeSlots: "evenly-spaced", positions: "four-cluster" },
    ]);
    for (const workload of densityV2InitializationFixtures) {
      expect(workload.format).toBe(DENSITY_WORKLOAD_FORMAT_V2);
      expect(() => validateDensityWorkload(workload)).not.toThrow();
      expect(normalizeDensityWorkload(workload)).toBe(workload);
    }

    const invalidActiveSlots = {
      ...densityV2PackedUniformFixture,
      initialization: { ...densityV2PackedUniformFixture.initialization, activeSlots: "random" },
    } as unknown as DensityWorkload;
    const invalidPositions = {
      ...densityV2PackedUniformFixture,
      initialization: { ...densityV2PackedUniformFixture.initialization, positions: "ring" },
    } as unknown as DensityWorkload;
    expect(() => validateDensityWorkload(invalidActiveSlots)).toThrow(
      "unsupported density initialization.activeSlots",
    );
    expect(() => validateDensityWorkload(invalidPositions)).toThrow(
      "unsupported density initialization.positions",
    );
  });
});
