export type Tick = number;
export type CommandSequence = number;

export interface CommandEnvelope<Command> {
  readonly tick: Tick;
  readonly sequence: CommandSequence;
  /** Canonical plain data. Admission copies and freezes the payload. */
  readonly command: Command;
}

export interface RandomSource {
  nextUint32(): number;
  nextInt(maxExclusive: number): number;
  nextFloat(): number;
}

export interface RandomStreamProvider {
  stream(name: string): RandomSource;
}

export interface WorldFactoryContext {
  readonly runSeed: string;
  readonly random: RandomStreamProvider;
}

export interface CommandContext {
  readonly tick: Tick;
  readonly sequence: CommandSequence;
  readonly random: RandomStreamProvider;
}

export interface SystemContext {
  readonly tick: Tick;
  readonly random: RandomStreamProvider;
}

export interface OrderedSystem<World> {
  readonly name: string;
  run(world: World, context: SystemContext): World | void;
}

export interface ScenarioDefinition<World, Command, Snapshot> {
  readonly id: string;
  readonly schemaVersion: number;
  createWorld(context: WorldFactoryContext): World;
  validateCommand(world: World, command: Command, context: CommandContext): void;
  applyCommand(world: World, command: Command, context: CommandContext): World | void;
  readonly systems: readonly OrderedSystem<World>[];
  /** Return canonical plain data; capture copies and freezes it. */
  snapshot(world: World): Snapshot;
}

export type FailurePhase = "validate-command" | "apply-command" | "system";

export interface FailureDetail {
  readonly tick: Tick;
  readonly phase: FailurePhase;
  readonly sequence?: CommandSequence;
  readonly systemName?: string;
}

export interface SimulationSnapshot<Snapshot> {
  readonly nextTick: Tick;
  readonly snapshot: Snapshot;
  readonly canonicalSnapshot: string;
  readonly snapshotDigest: string;
}
