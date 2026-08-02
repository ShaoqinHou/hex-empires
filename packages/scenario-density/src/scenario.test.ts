import { executeReplay, NamedRandomStreams, Simulation } from "@hex-empires/kernel";
import { describe, expect, it } from "vitest";

import {
  densityReplayFixture,
  densitySmokeWorkload,
  hybridDensityVariant,
  hybridDensityScenario,
  MAX_DENSITY_COORDINATE,
  MAX_DENSITY_TICKS,
  objectDensityScenario,
  objectDensityVariant,
  soaDensityScenario,
  soaDensityVariant,
  validateDensityWorkload,
} from "./index.js";
import type { DensityProfile } from "./index.js";

const profiles: readonly DensityProfile[] = ["update", "neighborhood-all-pairs", "churn", "snapshot", "replay"];

describe("density storage variants", () => {
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
});
