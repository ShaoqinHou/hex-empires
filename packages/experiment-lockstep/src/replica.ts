import {
  Simulation,
  type ScenarioDefinition,
  type SimulationSnapshot,
} from "@hex-empires/kernel";

import {
  canonicalizeAndValidateFrame,
  type CanonicalFrame,
  type ClosedTickFrame,
} from "./frame.js";
import {
  createLockstepSession,
  type InputLeadPolicy,
  type LockstepSession,
} from "./protocol.js";

export class ReplicaTerminalError extends Error {
  constructor(
    message: string,
    readonly failedAtTick: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ReplicaTerminalError";
  }
}

export class FrameConflictError extends ReplicaTerminalError {
  constructor(tick: number) {
    super(`tick ${tick} already has different canonical frame data`, tick);
    this.name = "FrameConflictError";
  }
}

export class CommandSequenceMismatchError extends ReplicaTerminalError {
  constructor(tick: number, expected: number, actual: number) {
    super(`tick ${tick} command sequence ${actual} does not match required sequence ${expected}`, tick);
    this.name = "CommandSequenceMismatchError";
  }
}

export interface FrameReceipt {
  readonly disposition: "advanced" | "buffered" | "duplicate";
  readonly advancedTicks: number;
  readonly nextTick: number;
}

export interface ReplicaOptions<World, Command, Snapshot> {
  readonly scenario: ScenarioDefinition<World, Command, Snapshot>;
  readonly runSeed: string;
  readonly rulesetId: string;
  readonly inputLead: InputLeadPolicy;
}

export class ClosedTickReplica<World, Command, Snapshot> {
  readonly session: LockstepSession;

  private readonly simulation: Simulation<World, Command, Snapshot>;
  private readonly acceptedFrames = new Map<number, CanonicalFrame<Command>>();
  private readonly bufferedFrames = new Map<number, CanonicalFrame<Command>>();
  private nextExpectedSequence = 0;
  private _terminalFailure: ReplicaTerminalError | undefined;

  constructor(options: ReplicaOptions<World, Command, Snapshot>) {
    this.session = createLockstepSession(
      options.scenario,
      options.runSeed,
      options.rulesetId,
      options.inputLead,
    );
    this.simulation = new Simulation(options.scenario, options.runSeed);
  }

  get nextTick(): number {
    return this.simulation.nextTick;
  }

  get bufferedTicks(): readonly number[] {
    return Object.freeze([...this.bufferedFrames.keys()].sort((left, right) => left - right));
  }

  get terminalFailure(): ReplicaTerminalError | undefined {
    return this._terminalFailure;
  }

  receive(candidate: ClosedTickFrame<Command>): FrameReceipt {
    this.assertHealthy();
    const incoming = canonicalizeAndValidateFrame(candidate, this.session);
    const prior = this.acceptedFrames.get(incoming.frame.tick);
    if (prior !== undefined) {
      if (prior.canonicalFrame !== incoming.canonicalFrame) {
        const failure = new FrameConflictError(incoming.frame.tick);
        this._terminalFailure = failure;
        throw failure;
      }
      return Object.freeze({ disposition: "duplicate", advancedTicks: 0, nextTick: this.nextTick });
    }

    this.acceptedFrames.set(incoming.frame.tick, incoming);
    this.bufferedFrames.set(incoming.frame.tick, incoming);
    let advancedTicks: number;
    try {
      advancedTicks = this.advanceContiguousPrefix();
    } catch (cause) {
      const failure =
        cause instanceof ReplicaTerminalError
          ? cause
          : new ReplicaTerminalError(
              `replica failed while executing closed tick ${this.nextTick}`,
              this.nextTick,
              { cause },
            );
      this._terminalFailure = failure;
      throw failure;
    }
    return Object.freeze({
      disposition: advancedTicks === 0 ? "buffered" : "advanced",
      advancedTicks,
      nextTick: this.nextTick,
    });
  }

  capture(): SimulationSnapshot<Snapshot> {
    this.assertHealthy();
    return this.simulation.capture();
  }

  private assertHealthy(): void {
    if (this._terminalFailure !== undefined) throw this._terminalFailure;
  }

  private advanceContiguousPrefix(): number {
    let advanced = 0;
    for (;;) {
      const canonical = this.bufferedFrames.get(this.nextTick);
      if (canonical === undefined) return advanced;

      let nextExpectedSequence = this.nextExpectedSequence;
      for (const envelope of canonical.frame.commands) {
        if (envelope.sequence !== nextExpectedSequence) {
          throw new CommandSequenceMismatchError(
            canonical.frame.tick,
            nextExpectedSequence,
            envelope.sequence,
          );
        }
        nextExpectedSequence += 1;
      }
      this.simulation.enqueueAll(canonical.frame.commands);
      this.simulation.runTicks(1);
      this.nextExpectedSequence = nextExpectedSequence;
      this.bufferedFrames.delete(canonical.frame.tick);
      advanced += 1;
    }
  }
}
