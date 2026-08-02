import { describe, expect, it } from "vitest";

import {
  CANONICAL_FORMAT,
  CanonicalizationError,
  canonicalDigest,
  canonicalStringify,
} from "./canonical.js";
import { NamedRandomStreams, RANDOM_ALGORITHM } from "./random.js";
import { executeReplay, REPLAY_FORMAT } from "./replay.js";
import {
  CommandAdmissionError,
  SIMULATION_PROTOCOL,
  Simulation,
  SimulationConfigurationError,
  SimulationFailure,
} from "./simulation.js";
import type { ScenarioDefinition } from "./types.js";

interface TraceWorld {
  readonly events: string[];
}

interface TraceCommand {
  readonly label: string;
}

function traceScenario(): ScenarioDefinition<TraceWorld, TraceCommand, readonly string[]> {
  return {
    id: "trace",
    schemaVersion: 1,
    createWorld: () => ({ events: [] }),
    validateCommand: () => undefined,
    applyCommand(world, command, context) {
      world.events.push(`command:${context.tick}:${context.sequence}:${command.label}`);
    },
    systems: [
      { name: "first", run: (world, context) => void world.events.push(`system:${context.tick}:first`) },
      { name: "second", run: (world, context) => void world.events.push(`system:${context.tick}:second`) },
    ],
    snapshot: (world) => world.events,
  };
}

describe("simulation ordering", () => {
  it("orders authority-admitted commands by tick and sequence, then runs systems in declaration order", () => {
    const simulation = new Simulation(traceScenario(), "ordering-seed");
    simulation.enqueue({ tick: 1, sequence: 0, command: { label: "future-first" } });
    simulation.enqueue({ tick: 0, sequence: 1, command: { label: "current-second" } });
    simulation.enqueue({ tick: 1, sequence: 2, command: { label: "future-third" } });
    simulation.runTicks(2);

    expect(simulation.capture().snapshot).toEqual([
      "command:0:1:current-second",
      "system:0:first",
      "system:0:second",
      "command:1:0:future-first",
      "command:1:2:future-third",
      "system:1:first",
      "system:1:second",
    ]);
    expect(simulation.nextTick).toBe(2);
    expect(simulation.systemOrder).toEqual(["first", "second"]);
  });

  it("rejects non-monotonic authority sequences and commands for completed ticks", () => {
    const simulation = new Simulation(traceScenario(), "admission-seed");
    simulation.enqueue({ tick: 0, sequence: 4, command: { label: "accepted" } });
    expect(() => simulation.enqueue({ tick: 1, sequence: 4, command: { label: "duplicate" } })).toThrow(
      CommandAdmissionError,
    );
    expect(() => simulation.enqueue({ tick: 1, sequence: 3, command: { label: "backward" } })).toThrow(
      CommandAdmissionError,
    );
    simulation.runTicks(1);
    expect(() => simulation.enqueue({ tick: 0, sequence: 5, command: { label: "past" } })).toThrow(
      "before next tick 1",
    );
  });

  it("owns admitted envelope values instead of reading later caller mutations", () => {
    const simulation = new Simulation(traceScenario(), "ownership-seed");
    const first = { tick: 0, sequence: 0, command: { label: "accepted-first" } };
    const second = { tick: 0, sequence: 1, command: { label: "accepted-second" } };
    simulation.enqueue(first);
    simulation.enqueue(second);

    first.sequence = 2;
    first.command.label = "mutated-first";
    second.sequence = 0;
    second.command.label = "mutated-second";
    simulation.runTicks(1);

    expect(simulation.capture().snapshot.slice(0, 2)).toEqual([
      "command:0:0:accepted-first",
      "command:0:1:accepted-second",
    ]);
  });

  it("rejects a batch atomically when any envelope is invalid", () => {
    const simulation = new Simulation(traceScenario(), "atomic-batch-seed");
    expect(() =>
      simulation.enqueueAll([
        { tick: 0, sequence: 0, command: { label: "must-not-leak" } },
        { tick: 0, sequence: 0, command: { label: "duplicate" } },
      ]),
    ).toThrow(CommandAdmissionError);

    simulation.enqueue({ tick: 0, sequence: 0, command: { label: "accepted-after-rejection" } });
    simulation.runTicks(1);
    expect(simulation.capture().snapshot[0]).toBe("command:0:0:accepted-after-rejection");
  });

  it("rejects ambiguous system declarations before creating a world", () => {
    const scenario = traceScenario();
    const invalid = { ...scenario, systems: [scenario.systems[0]!, scenario.systems[0]!] };
    expect(() => new Simulation(invalid, "config-seed")).toThrow(SimulationConfigurationError);
  });
});

describe("failure behavior", () => {
  it("poisons a run at the exact failed phase and never advances that tick", () => {
    const scenario: ScenarioDefinition<{ calls: number }, TraceCommand, number> = {
      id: "failure-probe",
      schemaVersion: 1,
      createWorld: () => ({ calls: 0 }),
      validateCommand: () => undefined,
      applyCommand: () => undefined,
      systems: [
        {
          name: "explode",
          run(world) {
            world.calls += 1;
            throw new Error("intentional failure");
          },
        },
      ],
      snapshot: (world) => world.calls,
    };
    const simulation = new Simulation(scenario, "failure-seed");

    let firstFailure: SimulationFailure | undefined;
    try {
      simulation.runTicks(1);
    } catch (error) {
      expect(error).toBeInstanceOf(SimulationFailure);
      firstFailure = error as SimulationFailure;
    }

    expect(firstFailure?.detail).toEqual({ tick: 0, phase: "system", systemName: "explode" });
    expect(simulation.nextTick).toBe(0);
    expect(() => simulation.runTicks(1)).toThrow(firstFailure);
    expect(() => simulation.capture()).toThrow(firstFailure);
  });

  it("poisons the run even when the thrown value cannot be converted to text", () => {
    const hostileCause = {
      toString(): string {
        throw new Error("secondary conversion failure");
      },
    };
    const scenario: ScenarioDefinition<{ calls: number }, TraceCommand, number> = {
      id: "hostile-failure-probe",
      schemaVersion: 1,
      createWorld: () => ({ calls: 0 }),
      validateCommand: () => undefined,
      applyCommand: () => undefined,
      systems: [
        {
          name: "throw-hostile-value",
          run(world) {
            world.calls += 1;
            throw hostileCause;
          },
        },
      ],
      snapshot: (world) => world.calls,
    };
    const simulation = new Simulation(scenario, "hostile-failure-seed");

    let failure: SimulationFailure | undefined;
    try {
      simulation.runTicks(1);
    } catch (error) {
      expect(error).toBeInstanceOf(SimulationFailure);
      failure = error as SimulationFailure;
    }
    expect(failure?.message).toContain("<unprintable thrown value>");
    expect(() => simulation.capture()).toThrow(failure);
    expect(() => simulation.runTicks(1)).toThrow(failure);
  });
});

describe("named deterministic random streams", () => {
  it("reproduces pinned values and isolates one stream from consumption in another", () => {
    const interleaved = new NamedRandomStreams("rng-contract-v1");
    const first = interleaved.stream("primary").nextUint32();
    interleaved.stream("unrelated").nextUint32();
    interleaved.stream("unrelated").nextUint32();
    const second = interleaved.stream("primary").nextUint32();

    const uninterrupted = new NamedRandomStreams("rng-contract-v1").stream("primary");
    expect([first, second]).toEqual([uninterrupted.nextUint32(), uninterrupted.nextUint32()]);
    expect([first, second]).toEqual([1_554_713_218, 345_433_328]);
  });

  it("uses unbiased bounded integers and validates stream arguments", () => {
    const streams = new NamedRandomStreams("bounds-seed");
    expect(Array.from({ length: 8 }, () => streams.stream("die").nextInt(6))).toEqual([0, 2, 0, 4, 3, 5, 0, 2]);
    expect(() => streams.stream("")).toThrow(TypeError);
    expect(() => streams.stream("die").nextInt(0)).toThrow(RangeError);
  });
});

describe("canonical evidence", () => {
  it("sorts object keys, preserves array order, and normalizes negative zero", () => {
    expect(canonicalStringify({ z: -0, a: [{ y: 2, x: 1 }] })).toBe('{"a":[{"x":1,"y":2}],"z":0}');
    expect(canonicalDigest({ b: 2, a: 1 })).toBe(canonicalDigest({ a: 1, b: 2 }));
  });

  it("rejects values without a cross-runtime canonical representation", () => {
    expect(() => canonicalStringify({ missing: undefined })).toThrow(CanonicalizationError);
    expect(() => canonicalStringify({ invalid: Number.NaN })).toThrow(CanonicalizationError);
    expect(() => canonicalStringify(new Uint8Array([1, 2]))).toThrow(CanonicalizationError);
    expect(() => canonicalStringify(Array(1))).toThrow(CanonicalizationError);
    const symbolKeyed = { valid: true, [Symbol("hidden")]: false };
    expect(() => canonicalStringify(symbolKeyed)).toThrow(CanonicalizationError);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => canonicalStringify(cyclic)).toThrow(CanonicalizationError);
    const accessorArray: unknown[] = [];
    Object.defineProperty(accessorArray, 0, { enumerable: true, get: () => 1 });
    expect(() => canonicalStringify(accessorArray)).toThrow("must be an enumerable data property");
  });

  it("produces owned, versioned replay evidence and rejects incomplete command logs", () => {
    const request = {
      scenario: traceScenario(),
      runSeed: "replay-seed",
      tickCount: 2,
      commands: [
        { tick: 0, sequence: 0, command: { label: "a" } },
        { tick: 1, sequence: 1, command: { label: "b" } },
      ],
    } as const;
    const first = executeReplay(request);
    const second = executeReplay(request);
    expect(second).toEqual(first);
    expect(first.nextTick).toBe(2);
    expect(first.evidenceDigest).toHaveLength(64);
    expect(first.protocol).toEqual({
      replayFormat: REPLAY_FORMAT,
      simulation: SIMULATION_PROTOCOL,
      canonical: CANONICAL_FORMAT,
      random: RANDOM_ALGORITHM,
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.snapshot)).toBe(true);
    expect(Object.isFrozen(first.commandLog)).toBe(true);

    expect(() => executeReplay({ ...request, tickCount: 1 })).toThrow(CommandAdmissionError);
  });

  it("keeps captures and command logs detached from scenario and caller aliases", () => {
    const scenario = traceScenario();
    const simulation = new Simulation(scenario, "capture-ownership-seed");
    simulation.runTicks(1);
    const capture = simulation.capture();
    simulation.runTicks(1);
    expect(capture.snapshot).toEqual(["system:0:first", "system:0:second"]);

    const command = { label: "original" };
    const commands = [{ tick: 0, sequence: 0, command }];
    const evidence = executeReplay({ scenario, runSeed: "evidence-ownership-seed", tickCount: 1, commands });
    command.label = "caller-mutated";
    commands[0]!.sequence = 9;
    expect(evidence.commandLog[0]).toEqual({
      tick: 0,
      sequence: 0,
      command: { label: "original" },
    });
    expect(() => (evidence.snapshot as string[]).push("tamper")).toThrow(TypeError);
    expect(canonicalStringify(evidence.snapshot)).toBe(evidence.canonicalSnapshot);
  });
});
