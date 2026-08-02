import { CANONICAL_FORMAT, canonicalDigest, cloneCanonical } from "./canonical.js";
import { RANDOM_ALGORITHM } from "./random.js";
import { CommandAdmissionError, SIMULATION_PROTOCOL, Simulation } from "./simulation.js";
import type { CommandEnvelope, ScenarioDefinition, SimulationSnapshot } from "./types.js";

export interface ReplayRequest<World, Command, Snapshot> {
  readonly scenario: ScenarioDefinition<World, Command, Snapshot>;
  readonly runSeed: string;
  readonly tickCount: number;
  readonly commands: readonly CommandEnvelope<Command>[];
}

export interface ReplayEvidence<Command, Snapshot> extends SimulationSnapshot<Snapshot> {
  readonly protocol: {
    readonly replayFormat: typeof REPLAY_FORMAT;
    readonly simulation: typeof SIMULATION_PROTOCOL;
    readonly canonical: typeof CANONICAL_FORMAT;
    readonly random: typeof RANDOM_ALGORITHM;
  };
  readonly scenario: {
    readonly id: string;
    readonly schemaVersion: number;
  };
  readonly runSeed: string;
  readonly systemOrder: readonly string[];
  readonly commandLog: readonly CommandEnvelope<Command>[];
  readonly evidenceDigest: string;
}

export const REPLAY_FORMAT = "simulation-playground/replay-evidence/v1";

export function executeReplay<World, Command, Snapshot>(
  request: ReplayRequest<World, Command, Snapshot>,
): ReplayEvidence<Command, Snapshot> {
  const scenarioDefinition = request.scenario;
  const runSeed = request.runSeed;
  const tickCount = request.tickCount;
  const requestedCommands = request.commands;
  if (!Number.isSafeInteger(tickCount) || tickCount < 0) {
    throw new CommandAdmissionError("replay tick count must be a non-negative safe integer");
  }
  for (const envelope of requestedCommands) {
    if (envelope.tick >= tickCount) {
      throw new CommandAdmissionError(
        `replay command at tick ${envelope.tick} falls outside tick count ${tickCount}`,
      );
    }
  }

  const protocol = Object.freeze({
    replayFormat: REPLAY_FORMAT,
    simulation: SIMULATION_PROTOCOL,
    canonical: CANONICAL_FORMAT,
    random: RANDOM_ALGORITHM,
  });
  const scenario = Object.freeze({ id: scenarioDefinition.id, schemaVersion: scenarioDefinition.schemaVersion });
  const commandLog = cloneCanonical<readonly CommandEnvelope<Command>[]>(requestedCommands);
  const simulation = new Simulation(scenarioDefinition, runSeed);
  simulation.enqueueAll(commandLog);
  simulation.runTicks(tickCount);
  const capture = simulation.capture();
  const metadata = {
    protocol,
    scenario,
    runSeed,
    nextTick: capture.nextTick,
    systemOrder: simulation.systemOrder,
    commandLog,
    snapshot: capture.snapshot,
  };

  return Object.freeze({
    ...capture,
    protocol,
    scenario,
    runSeed,
    systemOrder: metadata.systemOrder,
    commandLog,
    evidenceDigest: canonicalDigest(metadata),
  });
}
