import type { SyntheticChange, SyntheticEntity, SyntheticState } from "./contracts.js";
import {
  assertSafeNonNegativeInteger,
  assertUint32,
  validateChanges,
  validateContiguousAppendTick,
  validateRetention,
} from "./contracts.js";

export interface ObjectTimelineAccounting {
  readonly measuredAs: "logical-object-graph-v1";
  readonly payloadBytes: number;
  readonly metadataBytes: number;
  readonly totalBytes: number;
  readonly retainedVersions: number;
  readonly uniqueEntityNodes: number;
  readonly keyframeCount: 0;
  readonly deltaCount: 0;
}

export interface ObjectSeekResult {
  readonly state: SyntheticState;
  readonly reconstructionSteps: {
    readonly retainedRootReads: 1;
    readonly patchApplications: 0;
  };
}

/** Experiment-only immutable roots with shared unchanged entity leaves. */
export class StrategicObjectTimeline {
  readonly #retention: number;
  #versions: SyntheticState[];

  public constructor(initial: SyntheticState, retention: number) {
    validateRetention(retention);
    validateObjectState(initial);
    this.#retention = retention;
    this.#versions = [freezeState(initial)];
  }

  public append(tick: number, changes: readonly SyntheticChange[]): void {
    const current = this.#last();
    validateContiguousAppendTick(current.tick, tick);
    validateChanges(changes, current.entities.length);
    const entities = current.entities.slice();
    for (const change of changes) {
      const old = entities[change.entityIndex];
      if (old === undefined) throw new Error("validated entity is missing");
      entities[change.entityIndex] = Object.freeze({ id: old.id, influence: change.influence, supply: change.supply });
    }
    this.#versions.push(Object.freeze({ tick, entities: Object.freeze(entities) }));
    if (this.#versions.length > this.#retention) this.#versions.shift();
  }

  public seek(tick: number): ObjectSeekResult {
    assertSafeNonNegativeInteger(tick, "tick");
    const state = this.#versions.find((candidate) => candidate.tick === tick);
    if (state === undefined) throw new RangeError(this.#unavailableMessage(tick));
    return {
      state,
      reconstructionSteps: { retainedRootReads: 1, patchApplications: 0 },
    };
  }

  public forkAt(tick: number): StrategicObjectTimeline {
    return new StrategicObjectTimeline(this.seek(tick).state, this.#retention);
  }

  public retainedRange(): Readonly<{ earliestTick: number; latestTick: number }> {
    return { earliestTick: this.#first().tick, latestTick: this.#last().tick };
  }

  public accounting(): ObjectTimelineAccounting {
    const uniqueLeaves = new Set<SyntheticEntity>();
    for (const version of this.#versions) {
      for (const entity of version.entities) uniqueLeaves.add(entity);
    }
    // Logical format: each unique leaf has three uint32 payload fields. Each root has
    // uint64 tick + uint32 entity count and one uint32 leaf reference per entity.
    const payloadBytes = uniqueLeaves.size * 12;
    const metadataBytes = this.#versions.reduce((sum, version) => sum + 12 + version.entities.length * 4, 0);
    return {
      measuredAs: "logical-object-graph-v1",
      payloadBytes,
      metadataBytes,
      totalBytes: payloadBytes + metadataBytes,
      retainedVersions: this.#versions.length,
      uniqueEntityNodes: uniqueLeaves.size,
      keyframeCount: 0,
      deltaCount: 0,
    };
  }

  #first(): SyntheticState {
    const state = this.#versions[0];
    if (state === undefined) throw new Error("timeline invariant: no first version");
    return state;
  }

  #last(): SyntheticState {
    const state = this.#versions[this.#versions.length - 1];
    if (state === undefined) throw new Error("timeline invariant: no last version");
    return state;
  }

  #unavailableMessage(tick: number): string {
    const range = this.retainedRange();
    return `tick ${tick} is outside retained range ${range.earliestTick}..${range.latestTick}`;
  }
}

function validateObjectState(state: SyntheticState): void {
  assertSafeNonNegativeInteger(state.tick, "initial.tick");
  for (let index = 0; index < state.entities.length; index += 1) {
    const entity = state.entities[index];
    if (entity === undefined || entity.id !== index) throw new Error("initial entity IDs must equal their canonical array indices");
    assertUint32(entity.influence, "initial.influence");
    assertUint32(entity.supply, "initial.supply");
  }
}

function freezeState(state: SyntheticState): SyntheticState {
  return Object.freeze({
    tick: state.tick,
    entities: Object.freeze(state.entities.map((entity) => Object.freeze({ ...entity }))),
  });
}
