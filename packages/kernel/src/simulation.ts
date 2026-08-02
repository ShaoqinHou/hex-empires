import { canonicalStringify, cloneCanonical, digestCanonical, parseCanonical } from "./canonical.js";
import { NamedRandomStreams } from "./random.js";
import type {
  CommandContext,
  CommandEnvelope,
  FailureDetail,
  OrderedSystem,
  ScenarioDefinition,
  SimulationSnapshot,
  SystemContext,
} from "./types.js";

export const SIMULATION_PROTOCOL = "fixed-tick-command-sequence/v1";

function requireSafeNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new CommandAdmissionError(`${label} must be a non-negative safe integer`);
  }
}

function causeMessage(cause: unknown): string {
  try {
    return String(cause instanceof Error ? cause.message : cause);
  } catch {
    return "<unprintable thrown value>";
  }
}

export class SimulationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationConfigurationError";
  }
}

export class CommandAdmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandAdmissionError";
  }
}

export class SimulationFailure extends Error {
  constructor(
    readonly detail: FailureDetail,
    options: { readonly cause: unknown },
  ) {
    const location = detail.phase === "system" ? `system ${detail.systemName}` : `${detail.phase} sequence ${detail.sequence}`;
    super(`simulation failed at tick ${detail.tick} during ${location}: ${causeMessage(options.cause)}`, options);
    this.name = "SimulationFailure";
  }
}

function validateScenario<World, Command, Snapshot>(
  scenario: ScenarioDefinition<World, Command, Snapshot>,
): void {
  if (scenario.id.length === 0) throw new SimulationConfigurationError("scenario id must not be empty");
  if (!Number.isSafeInteger(scenario.schemaVersion) || scenario.schemaVersion < 1) {
    throw new SimulationConfigurationError("scenario schema version must be a positive safe integer");
  }

  const names = new Set<string>();
  for (const system of scenario.systems) {
    if (system.name.length === 0) throw new SimulationConfigurationError("system name must not be empty");
    if (names.has(system.name)) {
      throw new SimulationConfigurationError(`system name must be unique: ${system.name}`);
    }
    names.add(system.name);
  }
}

export class Simulation<World, Command, Snapshot> {
  private world: World;
  private readonly random: NamedRandomStreams;
  private readonly systems: readonly OrderedSystem<World>[];
  private readonly _systemOrder: readonly string[];
  private readonly validateCommand: ScenarioDefinition<World, Command, Snapshot>["validateCommand"];
  private readonly applyCommand: ScenarioDefinition<World, Command, Snapshot>["applyCommand"];
  private readonly snapshotWorld: ScenarioDefinition<World, Command, Snapshot>["snapshot"];
  private readonly queuedCommands = new Map<number, CommandEnvelope<Command>[]>();
  private lastSequence = -1;
  private failed: SimulationFailure | undefined;
  private _nextTick = 0;

  constructor(
    readonly scenario: ScenarioDefinition<World, Command, Snapshot>,
    readonly runSeed: string,
  ) {
    validateScenario(scenario);
    this.random = new NamedRandomStreams(runSeed);
    this.systems = Object.freeze(
      scenario.systems.map((system) =>
        Object.freeze({ name: system.name, run: system.run.bind(system) }),
      ),
    );
    this._systemOrder = Object.freeze(this.systems.map((system) => system.name));
    this.validateCommand = scenario.validateCommand.bind(scenario);
    this.applyCommand = scenario.applyCommand.bind(scenario);
    this.snapshotWorld = scenario.snapshot.bind(scenario);
    this.world = scenario.createWorld.call(scenario, Object.freeze({ runSeed, random: this.random }));
  }

  get nextTick(): number {
    return this._nextTick;
  }

  get systemOrder(): readonly string[] {
    return this._systemOrder;
  }

  enqueue(envelope: CommandEnvelope<Command>): void {
    this.assertHealthy();
    const admitted = this.prepareEnvelope(envelope, this.lastSequence);
    this.commitEnvelope(admitted);
    this.lastSequence = admitted.sequence;
  }

  enqueueAll(envelopes: readonly CommandEnvelope<Command>[]): void {
    this.assertHealthy();
    const admitted: CommandEnvelope<Command>[] = [];
    let previousSequence = this.lastSequence;
    for (const envelope of envelopes) {
      const prepared = this.prepareEnvelope(envelope, previousSequence);
      admitted.push(prepared);
      previousSequence = prepared.sequence;
    }
    for (const envelope of admitted) this.commitEnvelope(envelope);
    this.lastSequence = previousSequence;
  }

  runTicks(count: number): void {
    this.assertHealthy();
    requireSafeNonNegativeInteger(count, "tick count");
    for (let index = 0; index < count; index += 1) this.runOneTick();
  }

  capture(): SimulationSnapshot<Snapshot> {
    this.assertHealthy();
    const snapshot = this.snapshotWorld(this.world);
    const canonicalSnapshot = canonicalStringify(snapshot);
    return Object.freeze({
      nextTick: this._nextTick,
      snapshot: parseCanonical<Snapshot>(canonicalSnapshot),
      canonicalSnapshot,
      snapshotDigest: digestCanonical(canonicalSnapshot),
    });
  }

  private assertHealthy(): void {
    if (this.failed !== undefined) throw this.failed;
  }

  private fail(detail: FailureDetail, cause: unknown): never {
    const failure = new SimulationFailure(Object.freeze({ ...detail }), { cause });
    this.failed = failure;
    throw failure;
  }

  private prepareEnvelope(
    envelope: CommandEnvelope<Command>,
    previousSequence: number,
  ): CommandEnvelope<Command> {
    const tick = envelope.tick;
    const sequence = envelope.sequence;
    requireSafeNonNegativeInteger(tick, "command tick");
    requireSafeNonNegativeInteger(sequence, "command sequence");

    if (tick < this._nextTick) {
      throw new CommandAdmissionError(`command tick ${tick} is before next tick ${this._nextTick}`);
    }
    if (sequence <= previousSequence) {
      throw new CommandAdmissionError(
        `command sequence ${sequence} is not greater than accepted sequence ${previousSequence}`,
      );
    }

    return Object.freeze({ tick, sequence, command: cloneCanonical(envelope.command) });
  }

  private commitEnvelope(envelope: CommandEnvelope<Command>): void {
    const atTick = this.queuedCommands.get(envelope.tick) ?? [];
    atTick.push(envelope);
    this.queuedCommands.set(envelope.tick, atTick);
  }

  private runOneTick(): void {
    const tick = this._nextTick;
    const commands = [...(this.queuedCommands.get(tick) ?? [])].sort(
      (left, right) => left.sequence - right.sequence,
    );

    for (const envelope of commands) {
      const context: CommandContext = Object.freeze({ tick, sequence: envelope.sequence, random: this.random });
      try {
        this.validateCommand(this.world, envelope.command, context);
      } catch (cause) {
        this.fail({ tick, phase: "validate-command", sequence: envelope.sequence }, cause);
      }

      try {
        const replacement = this.applyCommand(this.world, envelope.command, context);
        if (replacement !== undefined) this.world = replacement;
      } catch (cause) {
        this.fail({ tick, phase: "apply-command", sequence: envelope.sequence }, cause);
      }
    }

    for (const system of this.systems) {
      const context: SystemContext = Object.freeze({ tick, random: this.random });
      try {
        const replacement = system.run(this.world, context);
        if (replacement !== undefined) this.world = replacement;
      } catch (cause) {
        this.fail({ tick, phase: "system", systemName: system.name }, cause);
      }
    }

    this.queuedCommands.delete(tick);
    this._nextTick += 1;
  }
}
